import React from 'react';

type ReactNode = React.ReactNode;

type RootImpl = {
  id: string;
  container: HTMLElement;
  element: ReactNode | null;
};

type StateHook<T = unknown> = {
  value: T;
};

type MemoHook<T = unknown> = {
  value: T;
  deps?: unknown[];
};

type RefHook<T = unknown> = {
  current: T;
};

type EffectHook = {
  deps?: unknown[];
  effect?: () => void | (() => void);
  cleanup?: void | (() => void);
};

type PendingEffect = {
  key: string;
  hookIndex: number;
};

const REACT_ELEMENT_TYPE = Symbol.for('react.element');
const REACT_TRANSITIONAL_ELEMENT_TYPE = Symbol.for('react.transitional.element');
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');

const hookStateMap = new Map<string, StateHook[]>();
const memoStateMap = new Map<string, MemoHook[]>();
const refStateMap = new Map<string, RefHook[]>();
const effectStateMap = new Map<string, EffectHook[]>();
const componentRootMap = new Map<string, RootImpl>();

let pendingEffects: PendingEffect[] = [];
let currentHookStates: StateHook[] = [];
let currentMemoStates: MemoHook[] = [];
let currentRefStates: RefHook[] = [];
let currentEffectStates: EffectHook[] = [];
let currentHookIndex = 0;
let currentMemoIndex = 0;
let currentRefIndex = 0;
let currentEffectIndex = 0;
let currentComponentKey: string | null = null;
let currentRenderingRoot: RootImpl | null = null;
let currentRenderedComponents: Set<string> = new Set();
let nextRootId = 0;

const renderQueue = new Set<RootImpl>();
let isRenderScheduled = false;

const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
const ReactCurrentDispatcher = ReactInternals?.ReactCurrentDispatcher;

function scheduleRender(root: RootImpl) {
  renderQueue.add(root);
  if (isRenderScheduled) return;
  isRenderScheduled = true;
  queueMicrotask(() => {
    const roots = Array.from(renderQueue);
    renderQueue.clear();
    isRenderScheduled = false;
    roots.forEach((target) => renderRoot(target));
  });
}

function renderRoot(root: RootImpl) {
  if (!root.element) {
    cleanupUnmounted(root, new Set());
    root.container.innerHTML = '';
    return;
  }
  currentRenderingRoot = root;
  currentRenderedComponents = new Set();
  pendingEffects = [];
  const node = renderNode(root.element, root.id);
  root.container.innerHTML = '';
  if (node) {
    root.container.appendChild(node);
  }
  flushPendingEffects();
  cleanupUnmounted(root, currentRenderedComponents);
  currentRenderingRoot = null;
}

function cleanupUnmounted(root: RootImpl, activeKeys: Set<string>) {
  for (const [key, mappedRoot] of Array.from(componentRootMap.entries())) {
    if (mappedRoot !== root) continue;
    if (activeKeys.has(key)) continue;
    const effects = effectStateMap.get(key);
    if (effects) {
      effects.forEach((effect) => {
        if (typeof effect?.cleanup === 'function') {
          try {
            effect.cleanup();
          } catch (err) {
            console.error(err);
          }
        }
      });
    }
    hookStateMap.delete(key);
    memoStateMap.delete(key);
    refStateMap.delete(key);
    effectStateMap.delete(key);
    componentRootMap.delete(key);
  }
}

function renderNode(element: ReactNode, path: string): Node | null {
  if (element === null || element === undefined || typeof element === 'boolean') {
    return null;
  }

  if (typeof element === 'string' || typeof element === 'number') {
    return document.createTextNode(String(element));
  }

  if (Array.isArray(element)) {
    const fragment = document.createDocumentFragment();
    element.forEach((child, index) => {
      const childNode = renderNode(child, `${path}.${index}`);
      if (childNode) {
        fragment.appendChild(childNode);
      }
    });
    return fragment;
  }

  if (typeof element === 'object') {
    const reactElement = element as React.ReactElement;
    if (
      reactElement.$$typeof !== REACT_ELEMENT_TYPE &&
      reactElement.$$typeof !== REACT_TRANSITIONAL_ELEMENT_TYPE
    ) {
      return null;
    }

    const type = reactElement.type;
    const props = reactElement.props ?? {};

    if (type === REACT_FRAGMENT_TYPE || type === REACT_STRICT_MODE_TYPE) {
      return renderFragmentChildren(props.children, path);
    }

    if (typeof type === 'function') {
      return renderComponent(reactElement, path);
    }

    if (typeof type === 'string') {
      const dom = document.createElement(type);
      applyProps(dom, props);
      const children = renderFragmentChildren(props.children, `${path}.children`);
      if (children) {
        dom.appendChild(children);
      }
      return dom;
    }
  }

  return document.createComment('unsupported');
}

function renderFragmentChildren(children: ReactNode, path: string): DocumentFragment | null {
  const fragment = document.createDocumentFragment();
  const array = flattenChildren(children);
  array.forEach((child, index) => {
    const key = getChildKey(child, index);
    const childNode = renderNode(child, `${path}.${key}`);
    if (childNode) {
      fragment.appendChild(childNode);
    }
  });
  return fragment;
}

function flattenChildren(children: ReactNode): ReactNode[] {
  const result: ReactNode[] = [];
  const push = (child: ReactNode) => {
    if (Array.isArray(child)) {
      child.forEach((nested) => push(nested));
      return;
    }
    result.push(child);
  };
  if (children !== null && children !== undefined) {
    push(children);
  }
  return result;
}

function getChildKey(child: ReactNode, index: number): string {
  if (typeof child === 'object' && child !== null && 'key' in (child as any) && (child as any).key != null) {
    return String((child as any).key);
  }
  return String(index);
}

function renderComponent(element: React.ReactElement, path: string): Node | null {
  const componentKey = `${path}:component`;
  currentRenderedComponents.add(componentKey);
  const root = currentRenderingRoot;
  if (!root) {
    throw new Error('Rendering without active root');
  }
  const previousDispatcher = ReactCurrentDispatcher?.current;
  const stateHooks = hookStateMap.get(componentKey) ?? [];
  const memoHooks = memoStateMap.get(componentKey) ?? [];
  const refHooks = refStateMap.get(componentKey) ?? [];
  const effectHooks = effectStateMap.get(componentKey) ?? [];

  currentHookStates = stateHooks;
  currentMemoStates = memoHooks;
  currentRefStates = refHooks;
  currentEffectStates = effectHooks;
  currentHookIndex = 0;
  currentMemoIndex = 0;
  currentRefIndex = 0;
  currentEffectIndex = 0;
  currentComponentKey = componentKey;
  componentRootMap.set(componentKey, root);

  if (ReactCurrentDispatcher) {
    ReactCurrentDispatcher.current = dispatcher;
  }

  let rendered: ReactNode;
  try {
    rendered = element.type(element.props);
  } finally {
    if (ReactCurrentDispatcher) {
      ReactCurrentDispatcher.current = previousDispatcher;
    }
  }

  hookStateMap.set(componentKey, currentHookStates);
  memoStateMap.set(componentKey, currentMemoStates);
  refStateMap.set(componentKey, currentRefStates);
  effectStateMap.set(componentKey, currentEffectStates);
  currentComponentKey = null;

  return renderNode(rendered, `${path}.child`);
}

function applyProps(dom: HTMLElement, props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'dangerouslySetInnerHTML') {
      if (key === 'dangerouslySetInnerHTML' && value && typeof value === 'object' && '__html' in (value as any)) {
        dom.innerHTML = String((value as any).__html ?? '');
      }
      continue;
    }
    if (key === 'className') {
      dom.className = value == null ? '' : String(value);
      continue;
    }
    if (key === 'style' && value && typeof value === 'object') {
      Object.assign(dom.style, value);
      continue;
    }
    if (key === 'ref' && value) {
      if (typeof value === 'function') {
        value(dom);
      } else if (typeof value === 'object') {
        (value as any).current = dom;
      }
      continue;
    }
    if (key === 'htmlFor') {
      dom.setAttribute('for', String(value));
      continue;
    }
    if (key === 'value') {
      (dom as HTMLInputElement | HTMLTextAreaElement).value = value == null ? '' : String(value);
      continue;
    }
    if (key === 'checked') {
      (dom as HTMLInputElement).checked = Boolean(value);
      continue;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      if (eventName === 'change' && dom instanceof HTMLInputElement) {
        dom.addEventListener('input', value as EventListener);
      }
      dom.addEventListener(eventName, value as EventListener);
      continue;
    }
    if (value === true) {
      dom.setAttribute(key, '');
      continue;
    }
    if (value === false || value === null || value === undefined) {
      dom.removeAttribute(key);
      continue;
    }
    dom.setAttribute(key, String(value));
  }
}

function depsChanged(prev?: unknown[], next?: unknown[]): boolean {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

function internalUseState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  if (!currentComponentKey) {
    throw new Error('useState called outside of component render');
  }
  const index = currentHookIndex++;
  const hooks = currentHookStates;
  if (!hooks[index]) {
    hooks[index] = {
      value: typeof initial === 'function' ? (initial as () => T)() : initial
    } as StateHook<T>;
  }
  const stateHook = hooks[index] as StateHook<T>;
  const root = componentRootMap.get(currentComponentKey);
  if (!root) {
    throw new Error('No root found for component');
  }
  const setState = (value: T | ((prev: T) => T)) => {
    const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(stateHook.value) : value;
    if (!Object.is(nextValue, stateHook.value)) {
      stateHook.value = nextValue;
      scheduleRender(root);
    }
  };
  return [stateHook.value, setState];
}

function internalUseMemo<T>(factory: () => T, deps?: unknown[]): T {
  const index = currentMemoIndex++;
  const hooks = currentMemoStates;
  const memoHook = hooks[index];
  if (!memoHook || depsChanged(memoHook.deps, deps)) {
    const value = factory();
    hooks[index] = { value, deps: deps ? [...deps] : undefined };
    return value;
  }
  return memoHook.value as T;
}

function internalUseCallback<T extends (...args: any[]) => any>(factory: T, deps?: unknown[]): T {
  return internalUseMemo(() => factory, deps);
}

function internalUseRef<T>(initial: T): RefHook<T> {
  const index = currentRefIndex++;
  const hooks = currentRefStates;
  if (!hooks[index]) {
    hooks[index] = { current: initial } as RefHook<T>;
  }
  return hooks[index] as RefHook<T>;
}

function internalUseEffect(effect: () => void | (() => void), deps?: unknown[]) {
  if (!currentComponentKey) {
    throw new Error('useEffect called outside of component render');
  }
  const index = currentEffectIndex++;
  const hooks = currentEffectStates;
  const effectHook = hooks[index];
  if (!effectHook) {
    hooks[index] = { deps: deps ? [...deps] : undefined, effect };
    pendingEffects.push({ key: currentComponentKey, hookIndex: index });
    return;
  }
  if (depsChanged(effectHook.deps, deps)) {
    hooks[index] = { deps: deps ? [...deps] : undefined, effect, cleanup: effectHook.cleanup };
    pendingEffects.push({ key: currentComponentKey, hookIndex: index });
  }
}

function internalUseLayoutEffect(effect: () => void | (() => void), deps?: unknown[]) {
  internalUseEffect(effect, deps);
}

function internalUseImperativeHandle(ref: any, create: () => any, deps?: unknown[]) {
  internalUseEffect(() => {
    const value = create();
    if (typeof ref === 'function') {
      ref(value);
      return () => ref(null);
    }
    if (ref && typeof ref === 'object') {
      ref.current = value;
      return () => {
        ref.current = null;
      };
    }
    return undefined;
  }, deps);
}

function internalUseReducer<R, A>(reducer: (state: R, action: A) => R, initialArg: R, init?: (arg: R) => R) {
  const initializer = init ? () => init(initialArg) : () => initialArg;
  const [state, setState] = internalUseState<R>(initializer as unknown as R);
  const dispatch = (action: A) => {
    setState((prev) => reducer(prev, action));
  };
  return [state, dispatch] as const;
}

function internalUseSyncExternalStore<T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T,
  _getServerSnapshot?: () => T
): T {
  const [value, setValue] = internalUseState<T>(() => getSnapshot());
  const ref = internalUseRef(value);
  ref.current = value;
  internalUseEffect(() => {
    const checkForUpdates = () => {
      const nextValue = getSnapshot();
      if (!Object.is(nextValue, ref.current)) {
        ref.current = nextValue;
        setValue(nextValue);
      }
    };
    checkForUpdates();
    const unsubscribe = subscribe(checkForUpdates);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [subscribe, getSnapshot]);
  return value;
}

function internalUseContext(context: any) {
  if (!context) return undefined;
  if ('_currentValue' in context) {
    return context._currentValue;
  }
  return context.defaultValue;
}

function internalUseDebugValue(_: unknown) {
  // no-op
}

let idCounter = 0;
function internalUseId() {
  idCounter += 1;
  return `mini-${idCounter}`;
}

function internalUseTransition() {
  const start = (callback: () => void) => {
    callback();
  };
  return [false, start] as const;
}

function internalUseDeferredValue<T>(value: T) {
  return value;
}

function flushPendingEffects() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach(({ key, hookIndex }) => {
    const effectHooks = effectStateMap.get(key);
    const hook = effectHooks?.[hookIndex];
    if (!hook) return;
    if (typeof hook.cleanup === 'function') {
      try {
        hook.cleanup();
      } catch (err) {
        console.error(err);
      }
    }
    const result = hook.effect?.();
    hook.cleanup = typeof result === 'function' ? result : undefined;
  });
}

const dispatcher: any = {
  useState: internalUseState,
  useMemo: internalUseMemo,
  useCallback: internalUseCallback,
  useRef: internalUseRef,
  useEffect: internalUseEffect,
  useLayoutEffect: internalUseLayoutEffect,
  useInsertionEffect: internalUseLayoutEffect,
  useImperativeHandle: internalUseImperativeHandle,
  useReducer: internalUseReducer,
  useSyncExternalStore: internalUseSyncExternalStore,
  useContext: internalUseContext,
  useDebugValue: internalUseDebugValue,
  useId: internalUseId,
  useTransition: internalUseTransition,
  useDeferredValue: internalUseDeferredValue,
  useMutableSource: () => {
    throw new Error('useMutableSource is not supported');
  }
};

export function createRoot(container: HTMLElement) {
  const root: RootImpl = {
    id: `root-${nextRootId++}`,
    container,
    element: null
  };

  return {
    render(element: ReactNode) {
      root.element = element;
      scheduleRender(root);
    },
    unmount() {
      root.element = null;
      scheduleRender(root);
    }
  };
}

export default {
  createRoot
};
