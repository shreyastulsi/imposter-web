'use client'

const CATEGORIES = [
  { hi: 'बॉलीवुड फिल्म', en: 'Bollywood Film' },
  { hi: 'बॉलीवुड अभिनेता', en: 'Bollywood Star' },
  { hi: 'बॉलीवुड गाना', en: 'Bollywood Song' },
  { hi: 'स्ट्रीट फूड', en: 'Street Food' },
  { hi: 'मिठाई', en: 'Indian Sweet' },
  { hi: 'मुख्य खाना', en: 'Main Dish' },
  { hi: 'त्योहार', en: 'Festival' },
  { hi: 'पौराणिक पात्र', en: 'Mythology' },
  { hi: 'भारतीय शहर', en: 'Indian City' },
  { hi: 'खेल', en: 'Sport' },
]

interface Props {
  onPick: (category: string) => void
}

export default function CategoryPicker({ onPick }: Props) {
  return (
    <div className="w-full">
      <p className="text-white/50 text-xs text-center uppercase tracking-widest mb-4">Pick a category for this round</p>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.hi}
            onClick={() => onPick(cat.hi)}
            className="bg-white/5 hover:bg-orange-600/20 border border-white/10 hover:border-orange-500/40 rounded-xl px-3 py-3 text-left transition-all active:scale-95"
          >
            <p className="text-white font-semibold text-sm">{cat.hi}</p>
            <p className="text-white/40 text-xs">{cat.en}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
