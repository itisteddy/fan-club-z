import React, { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Tag,
  Loader2,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost, adminPatch } from '@/lib/adminApi';
import * as Dialog from '@radix-ui/react-dialog';

interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
}

export const CategoriesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ slug: '', label: '', icon: '' });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ data: Category[] }>(`/api/v2/admin/categories`, actorId || '');
      setCategories(data.data || []);
    } catch (e) {
      console.error('[CategoriesPage] Fetch error:', e);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleToggleEnabled = async (categoryId: string, currentValue: boolean) => {
    setSaving(true);
    try {
      await adminPatch<any>(`/api/v2/admin/categories/${categoryId}`, actorId || '', {
        isEnabled: !currentValue,
      });
      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, isEnabled: !currentValue } : cat))
      );
      toast.success(`Category ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      console.error('[CategoriesPage] Toggle error:', e);
      toast.error(e?.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (category: Category, index: number) => {
    if (index === 0) return;
    const prevCategory = categories[index - 1];
    if (!prevCategory) return;
    setSaving(true);
    try {
      // Swap sort orders
      await Promise.all([
        adminPatch<any>(`/api/v2/admin/categories/${category.id}`, actorId || '', {
          sortOrder: prevCategory.sortOrder,
        }),
        adminPatch<any>(`/api/v2/admin/categories/${prevCategory.id}`, actorId || '', {
          sortOrder: category.sortOrder,
        }),
      ]);
      await fetchCategories(); // Refetch to get updated order
      toast.success('Category order updated');
    } catch (e: any) {
      console.error('[CategoriesPage] Move error:', e);
      toast.error(e?.message || 'Failed to reorder category');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDown = async (category: Category, index: number) => {
    if (index === categories.length - 1) return;
    const nextCategory = categories[index + 1];
    if (!nextCategory) return;
    setSaving(true);
    try {
      // Swap sort orders
      await Promise.all([
        adminPatch<any>(`/api/v2/admin/categories/${category.id}`, actorId || '', {
          sortOrder: nextCategory.sortOrder,
        }),
        adminPatch<any>(`/api/v2/admin/categories/${nextCategory.id}`, actorId || '', {
          sortOrder: category.sortOrder,
        }),
      ]);
      await fetchCategories(); // Refetch to get updated order
      toast.success('Category order updated');
    } catch (e: any) {
      console.error('[CategoriesPage] Move error:', e);
      toast.error(e?.message || 'Failed to reorder category');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.label.trim() || !newCategory.slug.trim()) {
      toast.error('Label and slug are required');
      return;
    }
    setSaving(true);
    try {
      await adminPost<any>(`/api/v2/admin/categories`, actorId || '', {
        slug: newCategory.slug.toLowerCase(),
        label: newCategory.label,
        icon: newCategory.icon || null,
      });
      toast.success('Category created');
      setShowAddModal(false);
      setNewCategory({ slug: '', label: '', icon: '' });
      await fetchCategories();
    } catch (e: any) {
      console.error('[CategoriesPage] Create error:', e);
      toast.error(e?.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate slug from label
  const handleLabelChange = (label: string) => {
    setNewCategory({
      ...newCategory,
      label,
      slug: label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, ''),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Tag className="w-7 h-7 text-emerald-500" />
            Categories
          </h1>
          <p className="text-slate-400 mt-1">Manage prediction categories</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-700">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(category, index)}
                    disabled={index === 0 || saving}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(category, index)}
                    disabled={index === categories.length - 1 || saving}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Category info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold">{category.label}</h3>
                    <span className="text-slate-400 text-sm font-mono">/{category.slug}</span>
                    {category.icon && <span className="text-slate-400">{category.icon}</span>}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Sort order: {category.sortOrder} • Created: {new Date(category.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Enabled toggle */}
              <button
                onClick={() => handleToggleEnabled(category.id, category.isEnabled)}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  category.isEnabled
                    ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                } disabled:opacity-50`}
              >
                {category.isEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[12000]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[12001] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-bold text-white">Add Category</Dialog.Title>
              <Dialog.Close className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Label *</label>
                <input
                  type="text"
                  value={newCategory.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g., Sports"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Slug *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g., sports"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Lowercase, alphanumeric, underscores only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Icon (optional)</label>
                <input
                  type="text"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  placeholder="e.g., ⚽ or trophy"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleCreate}
                disabled={saving || !newCategory.label.trim() || !newCategory.slug.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
