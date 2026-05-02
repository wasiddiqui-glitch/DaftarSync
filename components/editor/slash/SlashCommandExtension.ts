import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  SlashCommandMenu,
  type SlashCommandMenuRef,
} from "./SlashCommandMenu";
import { SLASH_COMMANDS, type SlashCommand } from "./commands";

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,

        items({ query }: { query: string }) {
          const q = query.toLowerCase();
          if (!q) return SLASH_COMMANDS;
          return SLASH_COMMANDS.filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q)
          );
        },

        render() {
          let component: ReactRenderer<SlashCommandMenuRef>;
          let popup: TippyInstance[];

          return {
            onStart(props: any) {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props: any) {
              component.updateProps(props);
              if (props.clientRect) {
                popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return component.ref?.handleKeyDown(props.event) ?? false;
            },

            onExit() {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },

        command({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: SlashCommand;
        }) {
          props.command({ editor, range });
        },
      }),
    ];
  },
});
