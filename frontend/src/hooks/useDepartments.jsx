import { createContext, useContext, useState, useEffect } from 'react';

const DepartmentsContext = createContext({ departments: [], loaded: false });

export function DepartmentsProvider({ children }) {
  const [state, setState] = useState({ departments: [], loaded: false });
  useEffect(() => {
    let alive = true;
    // 원본 admission-v3-dark.html:3080-3083 의미 1:1
    fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (alive) setState({ departments: Array.isArray(data) ? data : [], loaded: true }); })
      .catch(() => { if (alive) setState({ departments: [], loaded: true }); });
    return () => { alive = false; };
  }, []);
  return <DepartmentsContext.Provider value={state}>{children}</DepartmentsContext.Provider>;
}

export function useDepartments() { return useContext(DepartmentsContext); }
