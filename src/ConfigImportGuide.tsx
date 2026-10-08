import { tx } from './i18n';
import { useRef, useState } from 'react';
import { Check, Copy, FolderOpen } from 'lucide-react';
export const PROFILE_DIRECTORY = '%userprofile%\\Saved Games\\Respawn\\Apex\\profile';
export const LOCAL_DIRECTORY = '%userprofile%\\Saved Games\\Respawn\\Apex\\local';
export default function ConfigImportGuide() {
    const [copied, setCopied] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const profileInput = useRef<HTMLInputElement>(null);
    const localInput = useRef<HTMLInputElement>(null);
    async function copyDirectory(kind: 'profile' | 'local') {
        const input = kind === 'profile' ? profileInput.current : localInput.current;
        setCopied(null);
        setFailed(false);
        try {
            await navigator.clipboard.writeText(kind === 'profile' ? PROFILE_DIRECTORY : LOCAL_DIRECTORY);
            setCopied(kind);
        }
        catch {
            input?.focus();
            input?.select();
            setFailed(true);
        }
    }
    return <section className="config-import-guide" aria-label={tx("配置文件导入引导")}>
    <h2><FolderOpen size={18}/>{tx("找到 Apex 配置文件")}</h2>
    <ol>
      <li><strong>{tx("打开 profile 文件夹")}</strong><p>{tx("按 Win + R，粘贴下方路径后回车，或粘贴到资源管理器地址栏。")}</p>
        <div className="config-path-row"><input ref={profileInput} readOnly aria-label={tx("profile 配置目录")} value={PROFILE_DIRECTORY} onFocus={e => e.currentTarget.select()}/><button onClick={() => void copyDirectory('profile')}>{copied === 'profile' ? <Check size={13}/> : <Copy size={13}/>}{tx("复制 profile 路径")}</button></div>
      </li>
      <li><strong>{tx("选择对应文件")}</strong><p>{tx("改键后选择 profile.cfg；改键前选择 profile_backup.cfg。没有旧文件时，可以手动填写旧键位。")}</p></li>
      <li><strong>{tx("导入并应用")}</strong><p>{tx("将文件拖入下方对应上传框，查看识别结果，再点击「应用到方案」。")}</p></li>
    </ol>
    <details><summary>{tx("可选：补充 settings 文件")}</summary><p>{tx("settings.cfg 和 settings_backup.cfg 位于 local 文件夹，可以同时导入。自定义手柄布局应优先提供 profile 文件。")}</p>
      <div className="config-path-row"><input ref={localInput} readOnly aria-label={tx("local 配置目录")} value={LOCAL_DIRECTORY} onFocus={e => e.currentTarget.select()}/><button onClick={() => void copyDirectory('local')}>{copied === 'local' ? <Check size={13}/> : <Copy size={13}/>}{tx("复制 local 路径")}</button></div>
    </details>
    <p role="status" className="config-copy-status">{tx(failed ? '复制失败，已选中路径。请按 Ctrl + C 手动复制。' : copied ? '目录已复制，按 Win + R 粘贴后回车打开。' : '网页不会自动读取本机目录；请在文件夹中选择文件后导入。')}</p>
  </section>;
}
