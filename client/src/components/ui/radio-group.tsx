import * as React from 'react';
import { cn } from '../../lib/utils';

interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextType | undefined>(undefined);

const useRadioGroupContext = () => {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroup components must be used within RadioGroup');
  }
  return context;
};

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, defaultValue, children, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');

    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const currentValue = value !== undefined ? value : internalValue;

    return (
      <RadioGroupContext.Provider 
        value={{ 
          value: currentValue, 
          onValueChange: handleValueChange 
        }}
      >
        <div ref={ref} className={cn('grid gap-2', className)} {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ value, className, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useRadioGroupContext();
    const isSelected = selectedValue === value;

    return (
      <button
        type="button"
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {isSelected && (
          <div className="flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-current" />
          </div>
        )}
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={isSelected}
          onChange={() => onValueChange(value)}
          className="sr-only"
        />
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';