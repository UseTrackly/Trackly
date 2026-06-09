import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, RefreshCw, Image } from 'lucide-react';
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
    electronics: [
      { match: /xbox|playstation|nintendo|switch/i, question: "Which specific game or accessory? (e.g. NBA 2K23 Xbox Series X, PlayStation 5 DualSense Controller)" },
      { match: /controller/i, question: "Which controller exactly? (e.g. Xbox Wireless Controller Carbon Black, PS5 DualSense)" },
    ],
  };

  const patterns = vaguePatterns[category] || [];
  for (const p of patterns) {
    if (p.match.test(name)) return p.question;
  }

  // Generic vagueness check — name too short
  if (itemName.trim().split(' ').length <= 2) {
    return `Can you give more details about "${itemName}"? (brand, model, colorway, year, platform, etc.)`;
  }

  return null;
}

export default function ReferenceImageLookup({ itemName, category, onImageFound }) {
  const [loading, setLoading] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [clarifyQuestion, setClarifyQuestion] = useState('');
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [foundImage, setFoundImage] = useState(null);
  const [imageType, setImageType] = useState(null); // 'reference' or 'ai_generated'

  const fetchReferenceImage = async (searchQuery) => {
    setLoading(true);
    try {
      // Step 1: Use InvokeLLM to find official/reference image URLs from the web
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find an official product image URL for: "${searchQuery}".

Search for a real, publicly accessible image from official sources like:
- Manufacturer websites (nike.com, adidas.com, sony.com, microsoft.com, etc.)
- Major retailers (stockx.com, goat.com, amazon.com, bestbuy.com)
- Official databases (psacard.com, beckett.com for cards)

Return ONLY a direct image URL (ending in .jpg, .jpeg, .png, or .webp).
Return ONLY the raw URL, nothing else. No explanation, no markdown.`,
        add_context_from_internet: true,
      });

      const url = (result || '').trim().replace(/^["'\`]|["'\`]$/g, '');
      
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // Validate URL by checking it's not a placeholder
        if (!url.includes('placeholder') && !url.includes('via.placeholder')) {
          setFoundImage(url);
          setImageType('reference');
          onImageFound(url, 'reference');
          toast.success('Found reference image!');
          setLoading(false);
          return;
        }
      }
      
      throw new Error('No valid reference image found');
    } catch (error) {
      // Fallback: Generate AI image only if reference lookup fails
      try {
        const generated = await base44.integrations.Core.GenerateImage({
          prompt: `Professional product photo of ${searchQuery}, clean white background, high quality, realistic product listing photo`,
        });
        const imageUrl = generated?.url || generated?.image_url || (typeof generated === 'string' ? generated : null);
        if (imageUrl) {
          setFoundImage(imageUrl);
          setImageType('ai_generated');
          onImageFound(imageUrl, 'ai_generated');
          toast.success('AI generated reference image');
        } else {
          toast.error('Could not find image. Upload manually.');
        }
      } catch {
        toast.error('Could not generate image. Upload manually.');
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
      fetchReferenceImage(itemName);
    }
  };

  const handleClarifySubmit = () => {
    if (!clarifyAnswer.trim()) return;
    setClarifying(false);
    fetchReferenceImage(`${itemName} ${clarifyAnswer}`);
    setClarifyAnswer('');
  };

  if (foundImage) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <img src={foundImage} alt="Reference image" className="w-16 h-16 object-cover rounded-lg border border-border" />
          <div className="flex-1">
            <p className="text-xs font-medium flex items-center gap-1" style={{ color: imageType === 'reference' ? 'hsl(160 84% 39%)' : 'hsl(280 65% 60%)' }}>
              {imageType === 'reference' ? (
                <><Image className="w-3 h-3" /> Reference Image</>
              ) : (
                <><Search className="w-3 h-3" /> AI-Generated Reference</>
              )}
            </p>
            <button
              type="button"
              onClick={() => { setFoundImage(null); setImageType(null); onImageFound(null, null); }}
              className="text-xs text-muted-foreground underline mt-0.5"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            onClick={() => fetchReferenceImage(itemName)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Search again"
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
          <Search className="w-3 h-3" /> Need more details
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
            Search Image
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
        <Search className="w-4 h-4" />
      )}
      {loading ? 'Searching for reference image...' : "Find Reference Image"}
    </button>
  );
}