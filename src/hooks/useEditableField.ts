import { useState, useCallback } from 'react';

interface UseEditableFieldProps<T> {
  initialValue: T;
  onSave: (value: T) => void;
  validate?: (value: T) => string | undefined;
}

export function useEditableField<T>({ 
  initialValue, 
  onSave, 
  validate 
}: UseEditableFieldProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string>();

  const handleStartEdit = useCallback(() => {
    setValue(initialValue);
    setError(undefined);
    setIsEditing(true);
  }, [initialValue]);

  const handleSave = useCallback(() => {
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onSave(value);
    setIsEditing(false);
    setError(undefined);
  }, [value, validate, onSave]);

  const handleCancel = useCallback(() => {
    setValue(initialValue);
    setError(undefined);
    setIsEditing(false);
  }, [initialValue]);

  return {
    isEditing,
    value,
    error,
    setValue,
    handleStartEdit,
    handleSave,
    handleCancel
  };
}