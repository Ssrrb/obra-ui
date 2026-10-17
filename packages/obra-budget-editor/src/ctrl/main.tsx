/**
 * ctrl webview entry: Open Calc Studio as the "Presupuestos" editor inside a
 * VS Code webview. The host extension owns auth, API, persistence and
 * collaboration; this side only renders and talks the bridge protocol.
 */
import { OpenCalcStudio } from '../lib';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseHostMessage, statusText, themeFromBodyClass, type BudgetStatus, type WebviewToHost } from './bridge';
import { createBridgeController } from './controller';
import './ctrl.css';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();
const post = (msg: WebviewToHost) => vscode.postMessage(msg);

type StatusState = { status: BudgetStatus; message?: string };
let setStatusView: (s: StatusState) => void = () => {};
const controller = createBridgeController(post, (status, message) => setStatusView({ status, message }));
const onChange = controller.onChange;

function useVsCodeTheme() {
	const [theme, setTheme] = useState(() => themeFromBodyClass(document.body.classList));
	useEffect(() => {
		const obs = new MutationObserver(() => setTheme(themeFromBodyClass(document.body.classList)));
		obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
		return () => obs.disconnect();
	}, []);
	return theme;
}

function CtrlBudgetEditor() {
	const theme = useVsCodeTheme();
	const [status, setStatus] = useState<StatusState>({ status: 'loading' });
	setStatusView = setStatus;

	useEffect(() => {
		const onMessage = (e: MessageEvent) => {
			const msg = parseHostMessage(e.data);
			if (msg) controller.handle(msg);
		};
		window.addEventListener('message', onMessage);
		post({ v: 1, type: 'ready' });
		return () => window.removeEventListener('message', onMessage);
	}, []);

	const text = statusText(status.status, status.message);
	if (status.status === 'revoked') {
		return <div className="ctrl-revoked" role="alert">{text}</div>;
	}
	return (
		<>
			<OpenCalcStudio theme={theme} lang="es" onChange={onChange} onChangeDelay={300} />
			<div className={`ctrl-status ctrl-status-${status.status}`} role="status" aria-live="polite">{text}</div>
		</>
	);
}

createRoot(document.getElementById('root')!).render(<CtrlBudgetEditor />);
