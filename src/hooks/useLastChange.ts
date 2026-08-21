import { useState, useEffect } from 'react';
import { getLastChange, subscribeLastChange, LastChange } from '../lib/lastChange';

export function useLastChange(): LastChange | null {
  const [value, setValue] = useState<LastChange | null>(getLastChange);

  useEffect(() => subscribeLastChange(setValue), []);

  return value;
}
