import React, { useRef, useState, useEffect } from 'react';
import { getAllEmailVariables, EmailVariable } from '@/lib/emailVariables';

interface TinyMCEEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  variables?: EmailVariable[];
}

export default function TinyMCEEmailEditor({
  value,
  onChange,
  variables,
}: TinyMCEEmailEditorProps) {
  const editorRef = useRef<any>(null);
  const emailVariables = variables || getAllEmailVariables();
  const [isClient, setIsClient] = useState(false);
  const [Editor, setEditor] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    import('@tinymce/tinymce-react').then((module) => {
      setEditor(() => module.Editor);
    });
  }, []);

  if (!isClient || !Editor) {
    return (
      <div className="h-[500px] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-300">
        <div className="text-gray-600">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="tinymce-email-editor">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        onInit={(evt: any, editor: any) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(content: string) => onChange(content)}
        init={{
          height: 500,
          menubar: false,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'help',
            'wordcount',
            'emoticons',
          ],
          toolbar:
            'undo redo | blocks | bold italic forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | removeformat | ' +
            'variables | link image | code preview | help',
          toolbar_mode: 'sliding',
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #374151;
              background-color: #ffffff;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            td, th {
              padding: 8px;
              text-align: left;
            }
          `,
          setup: (editor: any) => {
            // Add custom handling to preserve variables structure
            editor.on('BeforeSetContent', (e: any) => {
              // Wrap standalone variables in spans to prevent TinyMCE from breaking them
              if (e.content) {
                e.content = e.content.replace(
                  /{{([^}]+)}}/g,
                  '<span class="email-variable" contenteditable="false">{{$1}}</span>'
                );
              }
            });

            editor.on('GetContent', (e: any) => {
              // Remove the span wrappers when getting content
              if (e.content) {
                e.content = e.content.replace(
                  /<span class="email-variable"[^>]*>{{([^}]+)}}<\/span>/g,
                  '{{$1}}'
                );
              }
            });

            editor.ui.registry.addMenuButton('variables', {
              text: 'Variables',
              icon: 'code-sample',
              fetch: (callback: any) => {
                const categories = emailVariables.reduce((acc, v) => {
                  if (!acc[v.category]) {
                    acc[v.category] = [];
                  }
                  acc[v.category].push(v);
                  return acc;
                }, {} as Record<string, EmailVariable[]>);

                const menuItems = Object.entries(categories).map(
                  ([category, vars]) => ({
                    type: 'nestedmenuitem',
                    text: category.charAt(0).toUpperCase() + category.slice(1),
                    getSubmenuItems: () =>
                      vars.map((v) => ({
                        type: 'menuitem',
                        text: `${v.label} - ${v.description}`,
                        onAction: () => {
                          editor.insertContent(v.value);
                        },
                      })),
                  })
                );

                callback(menuItems);
              },
            });

            editor.ui.registry.addAutocompleter('variables', {
              trigger: '{',
              minChars: 2,
              columns: 1,
              fetch: (pattern: string) => {
                const matches = emailVariables
                  .filter((v) =>
                    v.value.toLowerCase().includes(pattern.toLowerCase())
                  )
                  .map((v) => ({
                    type: 'autocompleteitem',
                    value: v.value,
                    text: v.label,
                    icon: 'code-sample',
                  }));
                return Promise.resolve(matches);
              },
              onAction: (autocompleteApi: any, rng: any, value: string) => {
                editor.selection.setRng(rng);
                editor.insertContent(value);
                autocompleteApi.hide();
              },
            });
          },
          forced_root_block: 'p',
          valid_elements: '*[*]',
          extended_valid_elements: '*[*]',
          paste_as_text: false,
          paste_data_images: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          images_upload_handler: async (blobInfo: any, progress: any) => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blobInfo.blob());
            });
          },
          protect: [/{{[\s\S]*?}}/g],
          skin: 'oxide',
          content_css: 'default',
        }}
      />
    </div>
  );
}
