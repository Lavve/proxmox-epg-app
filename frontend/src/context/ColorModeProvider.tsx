import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import type { ColorMode } from "../theme/theme";

const COLOR_MODE_STORAGE_KEY = "epg-color-mode";

interface ColorModeContextValue {
	mode: ColorMode;
	toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(
	undefined,
);

function readStoredColorMode(): ColorMode {
	if (typeof window === "undefined") {
		return "dark";
	}

	const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
	if (stored === "light" || stored === "dark") {
		return stored;
	}

	return "dark";
}

interface ColorModeProviderProps {
	children: ReactNode;
}

export function ColorModeProvider({ children }: ColorModeProviderProps) {
	const [mode, setMode] = useState<ColorMode>(() => readStoredColorMode());

	const toggleColorMode = useCallback(() => {
		setMode((current) => {
			const nextMode: ColorMode = current === "dark" ? "light" : "dark";
			window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
			return nextMode;
		});
	}, []);

	const value = useMemo(
		() => ({
			mode,
			toggleColorMode,
		}),
		[mode, toggleColorMode],
	);

	return (
		<ColorModeContext.Provider value={value}>
			{children}
		</ColorModeContext.Provider>
	);
}

export function useColorMode(): ColorModeContextValue {
	const context = useContext(ColorModeContext);
	if (!context) {
		throw new Error("useColorMode must be used within a ColorModeProvider");
	}
	return context;
}
