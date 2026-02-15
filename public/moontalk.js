import MoonTalk, { MoonTalk as MoonTalkNamed } from './moontalk/index.js';

if (typeof window !== 'undefined') {
    window.MoonTalk = MoonTalkNamed;
}

export { MoonTalkNamed as MoonTalk };
export default MoonTalk;
