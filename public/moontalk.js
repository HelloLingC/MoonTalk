import { MoonTalk } from './moontalk/index.js';

if (typeof window !== 'undefined') {
    window.MoonTalk = MoonTalk;
}

export { MoonTalk };
export default MoonTalk;
