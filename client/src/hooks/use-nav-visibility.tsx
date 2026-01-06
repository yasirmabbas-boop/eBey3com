import React, { createContext, useContext, useState, useCallback } from "react";

interface NavVisibilityContextType {
  isNavVisible: boolean;
  showNav: () => void;
  hideNav: () => void;
}

const NavVisibilityContext = createContext<NavVisibilityContextType>({
  isNavVisible: true,
  showNav: () => {},
  hideNav: () => {},
});

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isNavVisible, setIsNavVisible] = useState(true);

  const showNav = useCallback(() => setIsNavVisible(true), []);
  const hideNav = useCallback(() => setIsNavVisible(false), []);

  return (
    <NavVisibilityContext.Provider value={{ isNavVisible, showNav, hideNav }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext);
}
