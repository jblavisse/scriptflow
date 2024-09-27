// ToolbarPlugin.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  RangeSelection,
  NodeSelection,
  LexicalNode,
  ElementNode,
  $isNodeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isLinkNode } from '@lexical/link';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  Link as LinkIcon,
  FormatQuote,
  Code as CodeIcon,
  Undo,
  Redo,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
} from '@mui/icons-material';

import { Button } from "@/components/ui/button";

const LowPriority = 1;

function Divider() {
  return <div className="divider mx-2 border-l h-6" />;
}

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<HeadingTagType | 'paragraph'>('paragraph');
  const [isBulletList, setIsBulletList] = useState(false);
  const [isNumberedList, setIsNumberedList] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isQuote, setIsQuote] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if (!selection || !$isRangeSelection(selection)) {
      // If there's no selection or it's not a range selection
      return;
    }

    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrikethrough(selection.hasFormat('strikethrough'));

    const anchorNode = selection.anchor.getNode();
    let element = anchorNode.getTopLevelElement();

    if (!element) {
      console.warn('No top-level element found for anchor node:', anchorNode);
      return;
    }

    const elementType = element.getType();

    if (elementType === 'paragraph' || /^h\d$/.test(elementType)) {
      setBlockType(elementType as HeadingTagType | 'paragraph');
    } else {
      setBlockType('paragraph');
    }

    setIsBulletList($isListNode(element) && element.getTag() === 'ul');
    setIsNumberedList($isListNode(element) && element.getTag() === 'ol');
    setIsQuote($isQuoteNode(element));
    setIsCode($isCodeNode(element));

    const node = getSelectedNode(selection);
    const parent = node?.getParent();
    if ($isLinkNode(parent) || $isLinkNode(node)) {
      setIsLink(true);
    } else {
      setIsLink(false);
    }

    // Debugging logs
    console.log('Toolbar updated:', {
      isBold,
      isItalic,
      isUnderline,
      isStrikethrough,
      blockType,
      isBulletList,
      isNumberedList,
      isQuote,
      isCode,
      isLink,
    });
  }, [isBold, isItalic, isUnderline, isStrikethrough, blockType, isBulletList, isNumberedList, isQuote, isCode, isLink]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        $updateToolbar();
      });
    });
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        $updateToolbar();
        return false;
      },
      LowPriority,
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      LowPriority,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      LowPriority,
    );
  }, [editor]);

  return (
    <div className="toolbar flex items-center justify-start px-6 py-4 border-b space-x-2" ref={toolbarRef}>
      {/* Undo/Redo Buttons */}
      <button
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className={`toolbar-item ${canUndo ? 'active' : 'disabled'}`}
        aria-label="Undo"
      >
        <Undo />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className={`toolbar-item ${canRedo ? 'active' : 'disabled'}`}
        aria-label="Redo"
      >
        <Redo />
      </button>
      <Divider />
      
      {/* Block Type Selector */}
      <div className="toolbar-item block-controls">
        <select
          value={blockType}
          onChange={(e) => {
            const value = e.target.value as HeadingTagType | 'paragraph';
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const anchorOffset = selection.anchor.offset;
                const focusOffset = selection.focus.offset;
                const nodes = selection.getNodes();

                nodes.forEach((node) => {
                  const topLevelNode = node.getTopLevelElement();
                  if (!topLevelNode) {
                    console.warn('No top-level element found for node:', node);
                    return;
                  }
                  let newNode: ElementNode | null = null;

                  if (value === 'paragraph') {
                    newNode = $createParagraphNode();
                  } else if (value === 'h1' || value === 'h2' || value === 'h3') {
                    newNode = $createHeadingNode(value);
                  }

                  if (newNode && $isElementNode(topLevelNode)) {
                    const children = topLevelNode.getChildren();
                    topLevelNode.replace(newNode);
                    children.forEach((child: LexicalNode) => {
                      child.remove();
                      newNode!.append(child);
                    });

                    // Réapplique la sélection sur le nouveau nœud
                    newNode.select(anchorOffset, focusOffset);
                  }
                });
              }
            });
          }}
          className="bg-gray-100 border border-gray-300 rounded px-2 py-1"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>
      <Divider />

      {/* Text Formatting Buttons */}
      <Button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={`toolbar-item spaced ${isBold ? 'active' : ''}`}
        variant="ghost"
        aria-label="Bold"
      >
        <FormatBold />
      </Button>
      <Button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`toolbar-item spaced ${isItalic ? 'active' : ''}`}
        variant="ghost"
        aria-label="Italic"
      >
        <FormatItalic />
      </Button>
      <Button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={`toolbar-item spaced ${isUnderline ? 'active' : ''}`}
        variant="ghost"
        aria-label="Underline"
      >
        <FormatUnderlined />
      </Button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={`toolbar-item spaced ${isStrikethrough ? 'active' : ''}`}
        aria-label="Strikethrough"
      >
        <StrikethroughS />
      </button>
      <Divider />

      {/* List Buttons */}
      <Button
        onClick={() => {
          if (isBulletList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          } else {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }
        }}
        className={`toolbar-item spaced ${isBulletList ? 'active' : ''}`}
        variant="ghost"
        aria-label="Unordered List"
      >
        <FormatListBulleted />
      </Button>
      <button
        onClick={() => {
          if (isNumberedList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          } else {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }
        }}
        className={`toolbar-item spaced ${isNumberedList ? 'active' : ''}`}
        aria-label="Ordered List"
      >
        <FormatListNumbered />
      </button>
      <Divider />

      {/* Link Button */}
      <Button
        onClick={() => {
          if (isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
          } else {
            const url = window.prompt("Enter the URL of the link:", 'https://');
            if (url !== null) {
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
            }
          }
        }}
        className={`toolbar-item spaced ${isLink ? 'active' : ''}`}
        variant="ghost"
        aria-label="Insert Link"
      >
        <LinkIcon />
      </Button>
      
      {/* Quote Button */}
      <button
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();
              nodes.forEach((node) => {
                const topLevelNode = node.getTopLevelElement();
                if (!topLevelNode) {
                  console.warn('No top-level element found for node:', node);
                  return;
                }
                let newNode: ElementNode | null = null;

                if (isQuote) {
                  newNode = $createParagraphNode();
                  console.log('Converting QuoteNode to ParagraphNode');
                } else {
                  newNode = $createQuoteNode();
                  console.log('Creating QuoteNode');
                }

                if (newNode) {
                  if ($isElementNode(topLevelNode)) {
                    const children = topLevelNode.getChildren();
                    topLevelNode.replace(newNode);
                    children.forEach((child: LexicalNode) => {
                      newNode!.append(child); // Reinsert children
                    });
                  }
                }
              });
            } else {
              console.log("Selection is not a range selection.");
            }
          });
        }}
        className={`toolbar-item spaced ${isQuote ? 'active' : ''}`}
        aria-label="Toggle Quote Block"
      >
        <FormatQuote />
      </button>

     {/* Code Block Button */}
<button
  onClick={() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const topLevelNode = anchorNode.getTopLevelElementOrThrow();

        if ($isCodeNode(topLevelNode)) {
          // Si on est dans un CodeNode, on sort du bloc de code
          // en insérant un nouveau paragraphe après le CodeNode
          const paragraphNode = $createParagraphNode();
          topLevelNode.insertAfter(paragraphNode);
          // Déplacer le curseur dans le nouveau paragraphe
          paragraphNode.selectStart();
        } else {
          // Si on n'est pas dans un CodeNode, on insère un nouveau CodeNode
          const codeNode = $createCodeNode();
          // Remplacer le nœud actuel par le CodeNode
          topLevelNode.replace(codeNode);
          // Déplacer le curseur à l'intérieur du CodeNode
          codeNode.selectStart();
        }
      }
    });
  }}
  className={`toolbar-item spaced ${isCode ? 'active' : ''}`}
  aria-label="Toggle Code Block"
>
  <CodeIcon />
</button>

      <Divider />
    </div>
  );
}

function getSelectedNode(selection: RangeSelection | NodeSelection): LexicalNode | null {
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    if (anchorNode === focusNode) {
      return anchorNode;
    }
    return selection.isBackward() ? focusNode : anchorNode;
  } else if ($isNodeSelection(selection)) {
    const nodes = selection.getNodes();
    return nodes.length > 0 ? nodes[0] : null;
  }
  return null;
}