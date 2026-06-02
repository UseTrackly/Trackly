import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Determines if item name is too vague and needs clarification
function getNeedsMoreDetails(itemName, category) {
  const name = itemName.toLowerCase();

  const vaguePatterns = {
    sneakers: [
      { match: /jordan/i, question: "Which Jordan model is this? (e.g. Jordan 4 Retro, Jordan 1 High OG, Jordan 11 Concord)" },
      { match: /nike/i, question: "Which Nike shoe model exactly? (e.g. Nike Dunk Low Panda, Nike Air Max 90)" },
      { match: /yeezy/i, question: "Which Yeezy model and colorway? (e.g. Yeezy 350 V2 Zebra, Yeezy 700 Wave Runner)" },
      { match: /adidas/i, question: "Which Adidas model? (e.g. Adidas Samba OG, Adidas Forum Low)" },
      { match: /new balance/i, question: "Which New Balance model? (e.g. New Balance 550, New Balance 2002R)" },
    ],
    cards: [
      { match: /psa|bgs|sgc|cgc/i, question: "What card is this? Please provide player name, year, and set (e.g. 2003 Topps LeBron James RC PSA 10)" },
      { match: /card/i, question: "Which card specifically? Please provide player/character name, year, and set name." },
    ],
  };

  const patterns = vaguePatterns[category] || [];
  for (const p of patterns) {
    if (p.match.test(name)) return p.question;
  }

  // Generic vagueness check — name too short
  if (itemName.trim().split(' ').length <= 1) {
    return `Can you give more details about "${itemName}"? (brand, model, colorway, year, etc.)`;
  }

  return null;
}

export default function AIImageSearch({ itemName, category, onImageFound }) {
  const [loading, setLoading] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [foundImage, setFoundImage] = useState(null);

  const fetchImage = async (searchQuery) => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a product image finder. I need a real, publicly accessible image URL for: "${searchQuery}".

Search your knowledge for a well-known, high-quality product image URL for this exact item. 
Return ONLY a direct image URL (ending in .jpg, .jpeg, .png, or .webp) from a reputable source like:
- stockx.com
- goat.com  
- sneakernews.com
- beckett.com
- psacard.com
- flightclub.com
- or any major retailer/marketplace

Return ONLY the raw URL, nothing else. No explanation, no markdown, just the URL.`,
        add_context_from_internet: true,
      });

      const url = (result || '').trim().replace(/^["'\`]|["'\`]$/g, '');
      
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // Generate image via AI instead since LLM URL lookup is unreliable
        const generated = await base44.integrations.Core.GenerateImage({
          prompt: `Professional product photo of ${searchQuery}, clean white background, high quality, realistic, product listing style`,
        });
        const imageUrl = generated?.url || generated?.image_url || generated;
        if (imageUrl && typeof imageUrl === 'string') {
          setFoundImage(imageUrl);
          onImageFound(imageUrl);
          toast.success('AI found an image!');
        } else {
          throw new Error('No image returned');
        }
      } else {
        throw new Error('Could not find a valid image');
      }
    } catch {
      // Fallback: generate directly
      try {
        const generated = await base44.integrations.Core.GenerateImage({
          prompt: `Professional product photo of ${searchQuery}, clean white background, high quality, realistic product listing photo`,
        });
        const imageUrl = generated?.url || generated?.image_url || (typeof generated === 'string' ? generated : null);
        if (imageUrl) {
          setFoundImage(imageUrl);
          onImageFound(imageUrl);
          toast.success('AI generated an image!');
        } else {
          toast.error('Could not find an image. Try uploading one manually.');
        }
      } catch {
        toast.error('Could not generate image. Try uploading one manually.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    const clarifyQ = getNeedsMoreDetails(itemName, category);
    if (clarifyQ) {
      setClarifyQuestion(clarifyQ);
      setClarifying(true);
    } else {
      fetchImage(itemName);
    }
  };

  const handleClarifySubmit = () => {
    if (!clarifyAnswer.trim()) return;
    setClarifying(false);
    fetchImage(`${itemName} ${clarifyAnswer}`);
    setClarifyAnswer('');
  };

  if (foundImage) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <img src={foundImage} alt="AI found" className="w-16 h-16 object-cover rounded-lg border border-border" />
          <div className="flex-1">
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Image
            </p>
            <button
              type="button"
              onClick={() => { setFoundImage(null); onImageFound(null); }}
              className="text-xs text-muted-foreground underline mt-0.5"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            onClick={() => fetchImage(itemName)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Try another image"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  if (clarifying) {
    return (
      <div className="space-y-2 p-3 border border-primary/30 rounded-xl bg-primary/5">
        <p className="text-xs font-medium text-primary flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI needs more details
        </p>
        <p className="text-xs text-muted-foreground">{clarifyQuestion}</p>
        <Input
          value={clarifyAnswer}
          onChange={(e) => setClarifyAnswer(e.target.value)}
          placeholder="Type more details..."
          className="bg-background text-sm h-8"
          onKeyDown={(e) => e.key === 'Enter' && handleClarifySubmit()}
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleClarifySubmit} disabled={!clarifyAnswer.trim()} className="text-xs h-7 bg-primary">
            Find Image
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setClarifying(false)} className="text-xs h-7">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !itemName}
      className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-primary/40 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {loading ? 'Searching for image...' : "Don't have a picture? Use AI"}
    </button>
  );
}