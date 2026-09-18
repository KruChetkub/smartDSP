/// <reference types="vite/client" />

declare module '*/DashboardOverview' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/DashboardOverview/index' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/Dashboard' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/DashboardHealth' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/DashboardHealth/index' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/DataEntry' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/DataEntryHealth' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/ManageSDGs' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/ManageHealth' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/KPIGroup' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/Layout' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '*/AuthContext' {
  export const AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
  export function useAuth(): any;
}
