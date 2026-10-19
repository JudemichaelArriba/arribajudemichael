// Calm, non-judgemental replies for moderated messages. They never repeat what the visitor wrote.

export type ReplyLanguage = 'en' | 'tl' | 'ceb';
export type ModerationReplyKind = 'respect' | 'crisis' | 'unavailable';

const REPLIES: Readonly<Record<ModerationReplyKind, Readonly<Record<ReplyLanguage, string>>>> = {
    respect: {
        en: "I'm here to help with questions about Jude's work. Let's keep things respectful — feel free to ask about his projects or skills.",
        tl: 'Nandito ako para sumagot ng mga tanong tungkol sa trabaho ni Jude. Panatilihin nating magalang ang usapan — puwede kang magtanong tungkol sa mga proyekto o skills niya.',
        ceb: 'Ania ko aron motubag sa mga pangutana bahin sa trabaho ni Jude. Atong hupton nga matinahuron ang istorya — pwede ka mangutana bahin sa iyang mga proyekto o skills.',
    },
    crisis: {
        en: "I'm really sorry you're going through this, and I'm glad you said something. You don't have to carry it alone — please reach out to someone you trust, or to your local emergency hotline. If you're in immediate danger, contact your local emergency services right away. You matter.",
        tl: 'Pasensya na at pinagdadaanan mo ito, at salamat at nagsabi ka. Hindi mo kailangang harapin ito nang mag-isa — makipag-usap ka sa taong pinagkakatiwalaan mo, o tumawag sa lokal na emergency hotline. Kung nasa panganib ka ngayon, humingi agad ng tulong sa lokal na emergency services. Mahalaga ka.',
        ceb: 'Pasayloa ko nga naagian nimo kini, ug salamat nga nisulti ka. Dili nimo kinahanglan atubangon kini nga ikaw ra — palihug pakigsulti sa tawo nga imong gisaligan, o tawag sa lokal nga emergency hotline. Kung naa ka sa kapeligrohan karon, pangayo dayon og tabang sa lokal nga emergency services. Importante ka.',
    },
    unavailable: {
        en: "I couldn't check that message just now. Please try again in a moment.",
        tl: 'Hindi ko ma-check ang mensaheng iyan ngayon. Pakisubukang muli mamaya.',
        ceb: 'Dili nako ma-check kana nga mensahe karon. Palihug sulayi usab unya.',
    },
};

// Function words that are distinctive for each language. Words both languages use heavily
// (ang, sa, ko, mo, ka, ba, nga, lang, ako, siya, wala) are deliberately left out so they do not
// tip the balance.
const TAGALOG_MARKERS = new Set([
    'ng', 'mga', 'po', 'naman', 'ito', 'yung', 'ano', 'niya', 'ikaw', 'hindi', 'kasi', 'talaga',
    'din', 'rin', 'paano', 'saan', 'bakit', 'gusto', 'sya', 'kayo', 'tayo', 'natin', 'namin',
    'pwede', 'puwede', 'meron', 'mayroon', 'ngayon', 'siyempre', 'sobra',
]);
const CEBUANO_MARKERS = new Set([
    'unsa', 'nimo', 'nako', 'kay', 'gyud', 'jud', 'ug', 'dili', 'kini', 'kana', 'asa', 'ngano',
    'unsaon', 'naa', 'imo', 'imong', 'iyang', 'bitaw', 'lagi', 'diay', 'pud', 'sad', 'kaayo',
    'mao', 'karon', 'nimu', 'og', 'unya', 'kinsa', 'pila',
]);

export function detectReplyLanguage(text: string): ReplyLanguage {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    let tagalog = 0;
    let cebuano = 0;

    for (const word of words) {
        const isTagalog = TAGALOG_MARKERS.has(word);
        const isCebuano = CEBUANO_MARKERS.has(word);
        if (isTagalog && !isCebuano) tagalog += 1;
        if (isCebuano && !isTagalog) cebuano += 1;
    }

    if (cebuano > tagalog) return 'ceb';
    if (tagalog > 0) return 'tl';
    return 'en';
}

export function getModerationReply(kind: ModerationReplyKind, language: ReplyLanguage): string {
    return REPLIES[kind][language];
}
