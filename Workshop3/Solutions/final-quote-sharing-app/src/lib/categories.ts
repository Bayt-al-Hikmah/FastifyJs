export const QUOTE_CATEGORIES = [
    'Wisdom',
    'Motivation',
    'Life',
    'Philosophy',
    'Science',
    'Creativity',
    'Humour'
] as const

export type QuoteCategory = (typeof QUOTE_CATEGORIES)[number]
