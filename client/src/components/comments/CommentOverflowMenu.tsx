import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Flag, Ban } from 'lucide-react';
import { qaLog } from '../../utils/devQa';

interface CommentOverflowMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  isOwner?: boolean;
}

const CommentOverflowMenu: React.FC<CommentOverflowMenuProps> = ({
  onEdit,
  onDelete,
  onReport,
  onBlock,
  isOwner = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Menu items based on ownership and UGC
  const menuItems = [
    ...(isOwner && onEdit ? [{ 
      label: 'Edit', 
      icon: Edit2, 
      action: onEdit,
      destructive: false 
    }] : []),
    ...(isOwner && onDelete ? [{ 
      label: 'Delete', 
      icon: Trash2, 
      action: onDelete,
      destructive: true 
    }] : []),
    ...(onReport ? [{ 
      label: 'Report', 
      icon: Flag, 
      action: onReport,
      destructive: false 
    }] : []),
    ...(onBlock ? [{ 
      label: 'Block user', 
      icon: Ban, 
      action: onBlock,
      destructive: true 
    }] : []),
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < menuItems.length && menuItems[focusedIndex]) {
          handleItemClick(menuItems[focusedIndex].action);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(menuItems.length - 1);
        break;
    }
  };

  // Handle menu button click
  const handleButtonClick = () => {
    setIsOpen(!isOpen);
    setFocusedIndex(isOpen ? -1 : 0);
  };

  // Handle menu item click
  const handleItemClick = (action: () => void) => {
    qaLog('Comment overflow menu item clicked');
    setIsOpen(false);
    setFocusedIndex(-1);
    action();
  };

  // Don't render if no actions available
  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div className={`comment-overflow-menu ${isOpen ? 'open' : ''}`}>
      <button
        ref={buttonRef}
        className="comment-overflow-button"
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>
      
      {isOpen && (
        <div
          ref={menuRef}
          className="comment-overflow-menu-dropdown"
          role="menu"
          aria-label="Comment actions"
          onKeyDown={handleKeyDown}
        >
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.label}
                className={`comment-overflow-menu-item ${item.destructive ? 'destructive' : ''}`}
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => handleItemClick(item.action)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <IconComponent size={16} className="mr-2" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentOverflowMenu;