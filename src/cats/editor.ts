///<reference path='session.ts'/>
///<reference path='menu/editorcontextmenu.ts'/>
///<reference path='ui/autocompleteview.ts'/>
///<reference path='session.ts'/>

declare var $;

module Cats {


    export class Editor {
        public aceEditor: Ace.Editor;
        public toolTip: UI.ToolTip;
        private autoCompleteView: UI.AutoCompleteView;
        public onAutoComplete: Function;
        private mouseMoveTimer: number;

        // The sessions that are open by the editor
        sessions: Session[] = [];

        // The current session that is being edited
        public activeSession: Session;

        private editorContextMenu: Cats.Menu.EditorContextMenu;

        // private rootElement
        constructor(private rootElement: HTMLElement) {

            this.aceEditor = this.createEditor();
            this.aceEditor.setFontSize("16px");
            this.setTheme("cats");
            this.hide();            
        }

        init() {
            this.toolTip = new UI.ToolTip();
            this.autoCompleteView = new UI.AutoCompleteView(this.aceEditor);

            this.editorContextMenu = new Cats.Menu.EditorContextMenu(this);
            this.editorContextMenu.bindTo(this.rootElement);
            
        }

        getSession(name: string, project: Project): Session {
            for (var i = 0; i < this.sessions.length; i++) {
                var session = this.sessions[i];
                if ((session.name === name) && (project === session.project)) return session;
            }
        }
    
        addSession(session:Session) {
            this.sessions.push(session);
            session.update();
        }
    
        setSession(session: Session, pos?: Ace.Position) {
            
            if (this.activeSession === session) {
                if (pos) {
                    this.moveCursorTo(pos);
                    this.aceEditor.clearSelection();
                }
                return;
            }
            
            
            this.activeSession = session;
            this.aceEditor.setSession(session.editSession);
            if (pos) {
                this.moveCursorTo(pos);
                this.aceEditor.clearSelection();
            }
            this.aceEditor.focus();
            session.showErrors();
            tabbar.refresh();
            EventBus.emit(Event.editModeChanged,session.mode);
            EventBus.emit(Event.activeSessionChanged,session);
         
        }

        moveCursorTo(pos: Ace.Position = { column: 0, row: 0 }) {
            this.aceEditor.moveCursorTo(pos.row, pos.column);
        }


        show() {
            this.rootElement.style.display = "block";
            this.aceEditor.focus();
        }

        hide() {
            this.rootElement.style.display = "none";
        }

        setTheme(theme: string) {
            this.aceEditor.setTheme("ace/theme/" + theme);
            // Get the color of ace editor and use it to style the rest

            // Use a timeout to make sure the editor has updated its style
            setTimeout(function() {
                var isDark = $(".ace_dark").length > 0;
                var fg = isDark ? "white" : "black";
                var elem = $(".ace_scroller");
                var bg = elem.css("background-color");
                // var fg = elem.css("color");      
                $("html, #main, #navigator, #info, #result").css("background-color", bg);
                $("html").css("color", fg);
                $(".autocomplete").css("background-color", bg);
                $(".autocomplete").css("color", fg);
                $("input").css("background-color", fg);
                $("input").css("color", bg);
            }, 500);

        }

        // Close a single session
        closeSession(session: Session) {
            if (session.changed) {
                var c = confirm("Save " + session.name + " before closing ?");
                if (c) session.persist();
            }

            // Remove it for the list of sessions
            var index = this.sessions.indexOf(session);
            this.sessions.splice(index, 1);

            // Check if was the current session displayed
            if (this.activeSession === session) {
                this.activeSession === null;
                EventBus.emit(Event.activeSessionChanged,null,session);
                mainEditor.hide();
            }
            tabbar.refresh();
        }

        // Close all sessions and editor
        closeAllSessions() {
            this.sessions.forEach((session: Session) => {
                if (session.changed) {
                    var c = confirm("Save " + session.name + " before closing ?");
                    if (c != null) session.persist();
                };
            });
            this.sessions.length = 0;
            this.activeSession = null;
            mainEditor.hide();
            tabbar.refresh();
        }

        addCommand(command: Ace.EditorCommand) {
            this.aceEditor.commands.addCommand(command);
        }

        bindToMouse(fn) {
            this.rootElement.onmousemove = fn;
            this.rootElement.onmouseout = () => { this.toolTip.hide() };
        }

        autoComplete() {
            // if (this.activeSession.mode === "typescript") {
                var cursor = this.aceEditor.getCursorPosition();
                this.activeSession.autoComplete(cursor, this.autoCompleteView);
            // }                        
        }

        private onMouseMove(ev: MouseEvent) {
            this.toolTip.hide();
            var session = this.activeSession;
            clearTimeout(this.mouseMoveTimer);
            var elem = <HTMLElement>ev.srcElement;
            if (elem.className !== "ace_content") return;
            this.mouseMoveTimer = setTimeout(() => {
                session.showInfoAt(ev);
            }, 500);
        }

        // Initialize the editor
        private createEditor():Ace.Editor {
            var editor: Ace.Editor = ace.edit(this.rootElement);

            editor.commands.addCommands([
            {
                name: "autoComplete",
                bindKey: {
                    win: "Ctrl-Space",
                    mac: "Command-Space"
                },
                exec: () => { this.autoComplete() }
            },

            {
                name: "save",
                bindKey: {
                    win: "Ctrl-S",
                    mac: "Command-S"
                },
                exec: () => { this.activeSession.persist() }
            }
            ]);

            var originalTextInput = editor.onTextInput;
            editor.onTextInput = (text) => {
                originalTextInput.call(editor, text);
                if (text === ".") this.autoComplete();
            };

            var elem = this.rootElement; // TODo find scroller child
            elem.onmousemove = this.onMouseMove.bind(this);
            elem.onmouseout = () => {
                this.toolTip.hide()
                clearTimeout(this.mouseMoveTimer);
            };

            return editor;
        }

    }


}