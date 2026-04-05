import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, Check, X } from "lucide-react";

export interface QuoteSection {
  id?: string;
  title: string;
  content: string;
  position: number;
  placement: 'before_items' | 'after_items';
}

interface QuoteSectionsEditorProps {
  sections: QuoteSection[];
  onChange: (sections: QuoteSection[]) => void;
  language: string;
}

const SECTION_TEMPLATES = {
  en: [
    { title: "Project Overview", content: "Brief description of the project scope, objectives, and expected deliverables." },
    { title: "Included Services", content: "This quote includes the following services:" },
    { title: "Timeline", content: "Estimated project timeline:\n- Phase 1: Discovery & Planning\n- Phase 2: Development\n- Phase 3: Testing & Launch" },
    { title: "Payment Terms", content: "- 50% deposit required before work begins\n- Final payment due upon project completion\n- Payment terms: Net 30" },
  ],
  fr: [
    { title: "Aperçu du projet", content: "Description du périmètre du projet, des objectifs et des livrables attendus." },
    { title: "Services inclus", content: "Ce devis comprend les services suivants :" },
    { title: "Échéancier", content: "Calendrier estimé du projet :\n- Phase 1 : Découverte et planification\n- Phase 2 : Développement\n- Phase 3 : Tests et lancement" },
    { title: "Conditions de paiement", content: "- Acompte de 50 % requis avant le début des travaux\n- Paiement final à la livraison\n- Délai de paiement : 30 jours" },
  ]
};

export const QuoteSectionsEditor = ({ sections, onChange, language }: QuoteSectionsEditorProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPlacement, setEditPlacement] = useState<'before_items' | 'after_items'>('before_items');
  const [isAdding, setIsAdding] = useState(false);

  const isFr = language === 'fr';
  const templates = SECTION_TEMPLATES[isFr ? 'fr' : 'en'];

  const addSection = () => {
    if (!editTitle.trim()) return;
    const newSection: QuoteSection = {
      title: editTitle.trim(),
      content: editContent.trim(),
      position: sections.length,
      placement: editPlacement,
    };
    onChange([...sections, newSection]);
    resetEdit();
  };

  const updateSection = (index: number) => {
    if (!editTitle.trim()) return;
    const updated = [...sections];
    updated[index] = {
      ...updated[index],
      title: editTitle.trim(),
      content: editContent.trim(),
      placement: editPlacement,
    };
    onChange(updated);
    resetEdit();
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated.map((s, i) => ({ ...s, position: i })));
  };

  const startEdit = (index: number) => {
    const section = sections[index];
    setEditingIndex(index);
    setEditTitle(section.title);
    setEditContent(section.content);
    setEditPlacement(section.placement);
    setIsAdding(false);
  };

  const startAdd = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditContent("");
    setEditPlacement('before_items');
    setIsAdding(true);
  };

  const resetEdit = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditContent("");
    setEditPlacement('before_items');
    setIsAdding(false);
  };

  const addFromTemplate = (template: { title: string; content: string }) => {
    setEditTitle(template.title);
    setEditContent(template.content);
    setIsAdding(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {isFr ? 'Sections du devis' : 'Quote Sections'}
        </Label>
        {!isAdding && editingIndex === null && (
          <Button type="button" variant="outline" size="sm" onClick={startAdd}>
            <Plus className="h-3 w-3 mr-1" />
            {isFr ? 'Ajouter une section' : 'Add Section'}
          </Button>
        )}
      </div>

      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map((section, index) => (
            <Card key={index} className="border-dashed">
              <CardContent className="p-3">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      placeholder={isFr ? 'Titre de la section' : 'Section title'}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder={isFr ? 'Contenu de la section' : 'Section content'}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Select value={editPlacement} onValueChange={(v) => setEditPlacement(v as 'before_items' | 'after_items')}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_items">{isFr ? 'Avant les articles' : 'Before items'}</SelectItem>
                          <SelectItem value="after_items">{isFr ? 'Après les articles' : 'After items'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1 ml-auto">
                        <Button type="button" size="sm" onClick={() => updateSection(index)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={resetEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 mt-1">
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{section.title}</span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                          {section.placement === 'before_items' 
                            ? (isFr ? 'Avant' : 'Before') 
                            : (isFr ? 'Après' : 'After')}
                        </span>
                      </div>
                      {section.content && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{section.content}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(index)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSection(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdding && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder={isFr ? 'Titre de la section' : 'Section title'}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder={isFr ? 'Contenu de la section' : 'Section content'}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Select value={editPlacement} onValueChange={(v) => setEditPlacement(v as 'before_items' | 'after_items')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_items">{isFr ? 'Avant les articles' : 'Before items'}</SelectItem>
                  <SelectItem value="after_items">{isFr ? 'Après les articles' : 'After items'}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 ml-auto">
                <Button type="button" size="sm" onClick={addSection} disabled={!editTitle.trim()}>
                  <Plus className="h-3 w-3 mr-1" />
                  {isFr ? 'Ajouter' : 'Add'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={resetEdit}>
                  {isFr ? 'Annuler' : 'Cancel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdding && editingIndex === null && sections.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isFr ? 'Modèles rapides :' : 'Quick templates:'}
          </p>
          <div className="flex flex-wrap gap-1">
            {templates.map((tpl, i) => (
              <Button key={i} type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => addFromTemplate(tpl)}>
                {tpl.title}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
