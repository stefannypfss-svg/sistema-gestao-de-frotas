import { useState, useEffect } from 'react';
import { getLastChange, LastChange } from '../lib/lastChange';

export function useLastChange(): LastChange | null {
  const [value, setValue] = useState<LastChange | null>(getLastChange);

  useEffect(() => {
    const handler = () => setValue(getLastChange());
    window.addEventListener('fleet:lastChange', handler);
    return () => window.removeEventListener('fleet:lastChange', handler);
  }, []);

  return value;
}
