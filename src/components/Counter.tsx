import React from 'react';
import { useAppStore } from '../store/useAppStore';

export function Counter() {
  const { count, increment, decrement, reset } = useAppStore();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Compteur avec Zustand</h2>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>{count}</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={decrement}>-</button>
        <button onClick={reset}>Reset</button>
        <button onClick={increment}>+</button>
      </div>
    </div>
  );
}
