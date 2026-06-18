import { createTheme, type ThemeOptions } from "@mui/material/styles";

export type ColorMode = "light" | "dark";

const sharedThemeOptions: ThemeOptions = {
	spacing: 4,
	typography: {
		fontSize: 13,
		body2: {
			fontSize: "0.8125rem",
		},
		caption: {
			fontSize: "0.6875rem",
		},
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				html: {
					height: "100%",
				},
				body: {
					height: "100%",
					margin: 0,
				},
				"#root": {
					height: "100%",
				},
			},
		},
		MuiAppBar: {
			defaultProps: {
				elevation: 0,
			},
		},
		MuiToolbar: {
			styleOverrides: {
				root: {
					minHeight: 40,
					paddingLeft: 8,
					paddingRight: 8,
				},
			},
		},
		MuiTab: {
			defaultProps: {
				disableRipple: true,
			},
			styleOverrides: {
				root: {
					minHeight: 36,
					padding: "4px 12px",
					fontSize: "0.8125rem",
					textTransform: "none",
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				root: {
					minHeight: 36,
				},
			},
		},
		MuiTableCell: {
			styleOverrides: {
				root: {
					padding: "4px 8px",
				},
				head: {
					fontWeight: 600,
					fontSize: "0.75rem",
				},
			},
		},
		MuiListItem: {
			styleOverrides: {
				root: {
					paddingTop: 2,
					paddingBottom: 2,
				},
			},
		},
		MuiSwitch: {
			defaultProps: {
				size: "small",
			},
		},
		MuiTextField: {
			defaultProps: {
				size: "small",
			},
		},
		MuiIconButton: {
			defaultProps: {
				size: "small",
			},
		},
		MuiPaper: {
			defaultProps: {
				elevation: 0,
			},
		},
	},
};

export function createAppTheme(mode: ColorMode) {
	return createTheme({
		palette: {
			mode,
			...(mode === "dark"
				? {
						background: {
							default: "#0f1117",
							paper: "#161a22",
						},
					}
				: {
						background: {
							default: "#eef0f4",
							paper: "#ffffff",
						},
					}),
		},
		...sharedThemeOptions,
	});
}
