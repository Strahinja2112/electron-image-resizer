const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");

const isDev = process.env.NODE_ENV !== "production";
const isMac = process.platform === "darwin";

let mainWindow;
let aboutWindow;

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 500,
		height: 750,
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	// if (isDev) {
	// 	mainWindow.webContents.openDevTools();
	// }

	mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));

	mainWindow.webContents.on("new-window", (e, url) => {
		e.preventDefault();
		shell.openExternal(url);
	});
}

function createAboutWindow() {
	aboutWindow = new BrowserWindow({
		width: 500,
		height: 500,
		title: "About This App",
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
	});

	aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));

	aboutWindow.webContents.on("new-window", (e, url) => {
		e.preventDefault();
		shell.openExternal(url);
	});
}

app.on("ready", () => {
	createMainWindow();

	const mainMenu = Menu.buildFromTemplate(menu);
	Menu.setApplicationMenu(mainMenu);

	mainWindow.on("closed", () => (mainWindow = null));
});

const menu = [
	...(isMac
		? [
				{
					label: app.name,
					submenu: [
						{
							label: "About",
							click: createAboutWindow,
						},
					],
				},
		  ]
		: []),
	{
		role: "fileMenu",
	},
	...(!isMac
		? [
				{
					label: "About this App",
					click: createAboutWindow,
				},
		  ]
		: []),
];

ipcMain.on("image:resize", (_, options) => {
	options.dest = path.join(os.homedir(), "imageresizer");
	resizeImage(options);
});

async function resizeImage({ imgPath, height, width, dest }) {
	try {
		const newPath = await resizeImg(fs.readFileSync(imgPath), {
			width: +width,
			height: +height,
		});

		const filename = path.basename(imgPath);

		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest);
		}

		fs.writeFileSync(path.join(dest, filename), newPath);

		mainWindow.webContents.send("image:done");

		shell.openPath(dest);
	} catch (err) {
		console.log(err);
	}
}

app.on("window-all-closed", () => {
	if (!isMac) app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
