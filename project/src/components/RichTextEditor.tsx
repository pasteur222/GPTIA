import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Bold, Italic, Strikethrough, Underline as UnderlineIcon, List, ListOrdered, Quote, Undo, Redo, Palette } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLORS = [
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Vert', value: '#22c55e' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Gris', value: '#6b7280' },
  { name: 'Noir', value: '#000000' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] px-4 py-2',
        placeholder: placeholder,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, active, disabled, children, className = '' }: { 
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded hover:bg-gray-100 ${
        active ? 'bg-gray-100 text-red-600' : 'text-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );

  const ColorButton = ({ color, name }: { color: string; name: string }) => (
    <button
      type="button"
      onClick={() => {
        editor.chain().focus().setColor(color).run();
        setShowColorPicker(false);
      }}
      className="flex items-center gap-2 p-2 w-full hover:bg-gray-100 rounded"
    >
      <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
      <span className="text-sm">{name}</span>
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="relative">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1"
          >
            <Palette className="w-4 h-4" />
            <div 
              className="w-2 h-2 rounded-full border border-gray-300"
              style={{ 
                backgroundColor: editor.getAttributes('textStyle').color || '#000000'
              }} 
            />
          </ToolbarButton>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {COLORS.map((color) => (
                <ColorButton key={color.value} color={color.value} name={color.name} />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>
      
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
};

export default RichTextEditor;