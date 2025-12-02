import React, { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { getAllEmailVariables, EmailVariable } from '@/lib/emailVariables';

// Import TinyMCE
import 'tinymce/tinymce';
// Import theme
import 'tinymce/themes/silver';
// Import models
import 'tinymce/models/dom';
// Import icons
import 'tinymce/icons/default';
// Import plugins
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/emoticons';
// Import emoticons database
import 'tinymce/plugins/emoticons/js/emojis';

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

  // Build autocomplete items for variables
  const variableAutocompleteItems = emailVariables.map((v) => ({
    type: 'autocompleteitem',
    value: v.value,
    text: v.value,
    icon: 'code-sample',
  }));

  // Build menu items for variable insertion
  const variableMenuItems = emailVariables.map((v) => ({
    type: 'menuitem',
    text: `${v.label} (${v.value})`,
    onAction: () => {
      if (editorRef.current) {
        editorRef.current.insertContent(v.value);
      }
    },
  }));

  return (
    <div className="tinymce-email-editor">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        onInit={(evt, editor) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(content) => onChange(content)}
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
          // Custom setup for variable insertion
          setup: (editor) => {
            // Add Variables button
            editor.ui.registry.addMenuButton('variables', {
              text: 'Variables',
              icon: 'code-sample',
              fetch: (callback) => {
                // Group variables by category
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

                callback(menuItems as any);
              },
            });

            // Add autocomplete for variables (type {{ to trigger)
            editor.ui.registry.addAutocompleter('variables', {
              trigger: '{',
              minChars: 2,
              columns: 1,
              fetch: (pattern) => {
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
                return Promise.resolve(matches as any);
              },
              onAction: (autocompleteApi, rng, value) => {
                editor.selection.setRng(rng);
                editor.insertContent(value);
                autocompleteApi.hide();
              },
            });
          },
          // Email-friendly settings
          forced_root_block: 'p',
          valid_elements: '*[*]',
          extended_valid_elements: '*[*]',
          paste_as_text: false,
          paste_data_images: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          images_upload_handler: async (blobInfo, progress) => {
            // Convert image to base64
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blobInfo.blob());
            });
          },
          // Prevent TinyMCE from stripping our variable syntax
          protect: [/{{[\s\S]*?}}/g],
          // Skin and styling
          skin: 'oxide',
          content_css: 'default',
        }}
      />
    </div>
  );
}
