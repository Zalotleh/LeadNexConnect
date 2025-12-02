import React, { useEffect, useRef, useState } from 'react';
import { Eye, Code, Monitor, Smartphone, Save, X } from 'lucide-react';
import { getAllEmailVariables, EmailVariable } from '@/lib/emailVariables';

interface GrapeJSEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  onClose?: () => void;
  variables?: EmailVariable[];
}

export default function GrapeJSEmailEditor({
  value,
  onChange,
  onClose,
  variables,
}: GrapeJSEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);

  // Use provided variables or get all from manager
  const emailVariables = variables || getAllEmailVariables();

  useEffect(() => {
    // Dynamically import GrapeJS only on client side
    const initEditor = async () => {
      if (typeof window === 'undefined' || !editorRef.current) return;

      const grapesjs = (await import('grapesjs')).default;
      const grapesjsPresetNewsletter = (await import('grapesjs-preset-newsletter')).default;

      const editorInstance = grapesjs.init({
        container: editorRef.current,
        height: '100%',
        width: 'auto',
        plugins: [grapesjsPresetNewsletter],
        pluginsOpts: {
          'grapesjs-preset-newsletter': {
            modalTitleImport: 'Import Template',
            // Add custom blocks for variables
            blocks: emailVariables.map(v => v.value),
          },
        },
        storageManager: false,
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
          ],
        },
        // Device manager for responsive preview
        deviceManager: {
          devices: [
            {
              name: 'Desktop',
              width: '100%',
            },
            {
              name: 'Mobile',
              width: '320px',
              widthMedia: '480px',
            },
          ],
        },
        // Style manager for fonts, colors, etc.
        styleManager: {
          sectors: [
            {
              name: 'Typography',
              open: true,
              buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'],
            },
            {
              name: 'Decorations',
              open: false,
              buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
            },
            {
              name: 'Dimension',
              open: false,
              buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
            },
          ],
        },
        // Block manager with custom variable blocks
        blockManager: {
          appendTo: '#blocks-container',
          blocks: [
            {
              id: 'text-variable',
              label: 'Text + Variable',
              category: 'Variables',
              content: '<div style="padding: 10px;">{{companyName}}</div>',
            },
            ...emailVariables.map((variable, idx) => ({
              id: `var-${idx}`,
              label: variable.label,
              category: `Variables - ${variable.category}`,
              content: `<span style="color: #6366f1; font-weight: 600; padding: 2px 6px; background: #f0f0f0; border-radius: 4px;">${variable.value}</span>`,
            })),
          ],
        },
        // Add custom panels
        panels: {
          defaults: [
            {
              id: 'basic-actions',
              el: '.panel__basic-actions',
              buttons: [
                {
                  id: 'visibility',
                  active: true,
                  className: 'btn-toggle-borders',
                  label: '<i class="fa fa-clone"></i>',
                  command: 'sw-visibility',
                },
              ],
            },
            {
              id: 'panel-devices',
              el: '.panel__devices',
              buttons: [
                {
                  id: 'device-desktop',
                  label: '<i class="fa fa-desktop"></i>',
                  command: 'set-device-desktop',
                  active: true,
                },
                {
                  id: 'device-mobile',
                  label: '<i class="fa fa-mobile"></i>',
                  command: 'set-device-mobile',
                },
              ],
            },
          ],
        },
      });

      // Load initial content
      if (value) {
        editorInstance.setComponents(value);
      } else {
        // Load default email template
        editorInstance.setComponents(`
          <table style="width: 100%; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <tr>
              <td style="padding: 20px; background-color: #f8f9fa;">
                <h1 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">Hi {{contactName}}!</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  I noticed {{companyName}} is in the {{industry}} industry...
                </p>
                <a href="{{signUpLink}}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Get Started
                </a>
                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  {{signature}}
                </p>
              </td>
            </tr>
          </table>
        `);
      }

      // Save on change
      editorInstance.on('change:changesCount', () => {
        const html = editorInstance.getHtml();
        const css = editorInstance.getCss();
        const fullHtml = `<style>${css}</style>${html}`;
        onChange(fullHtml);
      });

      setEditor(editorInstance);
    };

    initEditor();

    // Cleanup
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, []);

  const handleSave = () => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      const fullHtml = `<style>${css}</style>${html}`;
      onChange(fullHtml);
    }
    if (onClose) onClose();
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
  };

  const toggleDevice = (device: 'desktop' | 'mobile') => {
    setViewMode(device);
    if (editor) {
      editor.setDevice(device === 'desktop' ? 'Desktop' : 'Mobile');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Email Editor</h2>
            
            {/* Device Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => toggleDevice('desktop')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'desktop'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={() => toggleDevice('mobile')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save & Close
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="h-full gjs-editor-wrapper">
              {/* Blocks Panel */}
              <div id="blocks-container" className="hidden" />
              
              {/* Main Editor */}
              <div ref={editorRef} className="h-full" />

              {/* Load GrapeJS CSS */}
              <style jsx global>{`
                @import 'grapesjs/dist/css/grapes.min.css';
                @import 'grapesjs-preset-newsletter/dist/grapesjs-preset-newsletter.min.css';

                .gjs-editor-wrapper {
                  position: relative;
                }

                /* Custom styling for GrapeJS */
                .gjs-cv-canvas {
                  background-color: #f3f4f6;
                }

                .gjs-block {
                  min-height: 50px;
                  padding: 10px;
                }

                .gjs-toolbar {
                  background-color: #6366f1 !important;
                }

                .gjs-toolbar .gjs-toolbar-item {
                  color: white !important;
                }
              `}</style>
            </div>
          ) : (
            <div className="h-full bg-gray-100 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h3>
                <div 
                  className="border rounded-lg p-4"
                  dangerouslySetInnerHTML={{ 
                    __html: editor ? `<style>${editor.getCss()}</style>${editor.getHtml()}` : value 
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <span>💡 Drag components from the left panel to build your email</span>
            <span>🎨 Click any element to customize fonts, colors, and spacing</span>
            <span>📱 Test on both desktop and mobile views</span>
            <span>🔧 Use variables like <code className="bg-gray-200 px-1 rounded">{'{{companyName}}'}</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
