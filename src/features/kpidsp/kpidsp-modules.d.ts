declare module '*.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/pages/*' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/components/*' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/context/*' {
  export const AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
  export function useAuth(): any;
}

