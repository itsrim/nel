# React + TypeScript + Vite + PWA + Zustand + Storybook

Projet Nel - Application React TypeScript vierge avec PWA, Zustand et Storybook

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Storybook

Lancer Storybook en mode développement :
```bash
npm run storybook
```

Construire Storybook pour la production :
```bash
npm run build-storybook
```

## Déploiement

```bash
npm run predeploy
npm run deploy
```

## Zustand

Le projet utilise [Zustand](https://github.com/pmndrs/zustand) pour la gestion d'état. Un exemple de store est disponible dans `src/store/useAppStore.ts`.

Exemple d'utilisation :
```typescript
import { useAppStore } from './store/useAppStore';

function MyComponent() {
  const { count, increment, decrement } = useAppStore();
  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
