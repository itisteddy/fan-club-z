// @ts-nocheck
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PredictionDetailsWrapper from '../PredictionDetailsWrapper';
import { usePredictionStore } from '../../../store/predictionStore';
import { useErrorHandling } from '../../../hooks/useErrorHandling';

// Mock the stores and hooks
vi.mock('../../../store/predictionStore');
vi.mock('../../../hooks/useErrorHandling');
vi.mock('../../../auth/useAuthAdapter');
vi.mock('../../../utils/devQa');

const mockUsePredictionStore = vi.mocked(usePredictionStore);
const mockUseErrorHandling = vi.mocked(useErrorHandling);

// Mock prediction data
const mockPrediction = {
  id: 'test-prediction-id',
  title: 'Test Prediction',
  description: 'This is a test prediction',
  creator: {
    id: 'creator-id',
    username: 'testuser',
    displayName: 'Test User',
  },
  status: 'active',
  endDate: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
  totalStaked: 1000,
  participantCount: 5,
  options: [
    {
      id: 'option-1',
      text: 'Option 1',
      stakeAmount: 500,
      odds: 2.0,
    },
    {
      id: 'option-2',
      text: 'Option 2',
      stakeAmount: 500,
      odds: 2.0,
    },
  ],
};

const mockPredictionWithoutCreator = {
  ...mockPrediction,
  creator: null,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('PredictionDetailsWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUsePredictionStore.mockReturnValue({
      predictions: [],
      fetchPrediction: vi.fn(),
      status: 'idle',
      error: null,
      retry: vi.fn(),
    });

    mockUseErrorHandling.mockReturnValue({
      errorState: { error: null, isRetrying: false, retryCount: 0, lastError: null },
      clearError: vi.fn(),
      setError: vi.fn(),
      retry: vi.fn(),
      executeWithErrorHandling: vi.fn(),
      canRetry: true,
      isError: false,
      isRetrying: false,
    });
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    expect(screen.getByText('Loading prediction details...')).toBeInTheDocument();
  });

  it('renders error state when prediction fetch fails', async () => {
    mockUsePredictionStore.mockReturnValue({
      predictions: [],
      fetchPrediction: vi.fn(),
      status: 'error',
      error: 'Failed to load prediction',
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load prediction')).toBeInTheDocument();
    });
  });

  it('renders not found state when prediction is null', async () => {
    mockUsePredictionStore.mockReturnValue({
      predictions: [],
      fetchPrediction: vi.fn(),
      status: 'success',
      error: null,
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction Not Found')).toBeInTheDocument();
    });
  });

  it('renders warning when creator is missing', async () => {
    mockUsePredictionStore.mockReturnValue({
      predictions: [mockPredictionWithoutCreator],
      fetchPrediction: vi.fn(),
      status: 'success',
      error: null,
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("This prediction's creator is no longer available. Some features may be limited.")).toBeInTheDocument();
    });
  });

  it('renders children when prediction is loaded successfully', async () => {
    mockUsePredictionStore.mockReturnValue({
      predictions: [mockPrediction],
      fetchPrediction: vi.fn(),
      status: 'success',
      error: null,
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div data-testid="test-content">Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  it('handles navigation back correctly', async () => {
    const mockBack = vi.fn();
    Object.defineProperty(window, 'history', {
      value: {
        back: mockBack,
        length: 2,
      },
      writable: true,
    });

    mockUsePredictionStore.mockReturnValue({
      predictions: [mockPrediction],
      fetchPrediction: vi.fn(),
      status: 'success',
      error: null,
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      const backButton = screen.getByLabelText('Go back');
      backButton.click();
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('validates prediction ID format', async () => {
    // Mock invalid prediction ID
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        pathname: '/prediction/invalid-id',
      },
      writable: true,
      configurable: true,
    });

    mockUsePredictionStore.mockReturnValue({
      predictions: [],
      fetchPrediction: vi.fn(),
      status: 'idle',
      error: null,
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <PredictionDetailsWrapper>
          <div>Test Content</div>
        </PredictionDetailsWrapper>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction Not Found')).toBeInTheDocument();
    });

    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });
});
