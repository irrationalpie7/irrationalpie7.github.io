(() => {
    // typing params
    const TYPE_SPEED = 5;
    const SEND_DELAY = 500;

    // store all the timers so that they can be cleared
    let TIMERS = [];
    // store all the timings
    const TIMINGS = []

    const ELEMENTS = {
        credits: document.getElementById("credits"),

        chatwindows: getWindowMap("chat-window"),

        audioPlayer: document.getElementById("audio"),
        messages: getMessages()
    }

    function getWindowMap() {
        const newmap = new Map();
        for (let element of document.getElementsByClassName("chat-window")) {
            newmap.set(element.getAttribute("id"), getChatWindowInfo(element));
        }
        return newmap;
    }

    /**
     * 
     * @param {HTMLElement} windowElement 
     */
    function getChatWindowInfo(windowElement) {
        const windowId = windowElement.getAttribute("id");

        let window = {};

        window["id"] = windowId
        window["window"] = windowElement
        window["theme"] = windowElement.dataset.theme

        window["chat-title"] = document.getElementById("chat-title-" + windowId)
        window["title"] = window["chat-title"].textContent

        window["typing"] = document.getElementById("typing-" + windowId)
        window["typers"] = document.getElementById("typers-" + windowId)

        window["prompt"] = document.getElementById("prompt-" + windowId)
        window["typeSpace"] = document.getElementById("typewriter-space-" + windowId)
        window["default-prompt"] = document.getElementById("default-prompt-" + windowId)

        return window;
    }

    /**
     * List of messages sorted by message ids, since those are the source of truth
     * as to what order they should appear in chronologically.
     * @returns {HTMLElement[]}
     */
    function getMessages() {
        const list = Array.from(document.getElementsByClassName("message-container"));
        list.sort((a, b) => ((a.getAttribute("id") || "").localeCompare(b.getAttribute("id"))));
        return list;
    }

    /**
     * @returns {Map<string,HTMLElement>}
     */
    function getElementMap(classname) {
        const newmap = new Map();
        for (let element of document.getElementsByClassName(classname)) {
            newmap.set(element.getAttribute("id"), element);
        }
        return newmap;
    }

    function setTimeoutWrapper(callbackShow, callbackHide, seconds) {
        if (seconds < 0) {
            callbackShow();
        } else {
            callbackHide();
            let timer = setTimeout(callbackShow, seconds * 1000)
            TIMERS.push(timer)
        }
    }

    function timeoutModifyMessage(timing, currentTime) {
        const element = timing.element;
        const promptText = timing.prompt;
        const time = timing.timing - currentTime;
        // get the prompt associated with the current window
        const prompt = ELEMENTS.chatwindows.get(timing.windowId)["prompt"]
        setTimeoutWrapper(() => {
            element.classList.add("visible");
            prompt.innerText = promptText;
        }, () => {
            element.classList.remove("visible");
        }, time)
    }

    function getMessageText(messageElement) {
        return messageElement.firstElementChild.lastElementChild.innerText;
    }

    function getMessageStartTime(messageTime, currentTime) {
        return messageTime - currentTime;
    }

    function getTextTiming(timing, currentTime) {
        const txtStart = parseInt(timing.element.dataset.typestart)
        const txt = getMessageText(timing.element).slice(txtStart)
        const startTime = timing.timing - currentTime
        const timeOut = startTime - txt.length * TYPE_SPEED / 1000 - SEND_DELAY / 1000

        return { txt, timeOut, startTime }
    }

    function timeoutTyper(txtObj, currentTime) {
        // get the typing space associated with the current window
        const typingElement = ELEMENTS.chatwindows.get(txtObj.windowId)["typeSpace"];
        const { txt, timeOut, startTime } = getTextTiming(txtObj, currentTime)

        if (timeOut < 0) {
            return;
        }
        for (let i = 0; i < txt.length; i++) {
            const letter = txt.charAt(i)
            const timer = setTimeout(() => {
                typingElement.innerHTML += letter;
            }, timeOut * 1000 + i * TYPE_SPEED)
            TIMERS.push(timer);
        }
        const timer = setTimeout(() => {
            typingElement.innerHTML = '';
        }, startTime * 1000)
        TIMERS.push(timer)
    }

    function countVisibleTypers(windowId) {
        const typerDivs = ELEMENTS.chatwindows.get(windowId)["typers"].children;

        let visCount = 0;

        for (let i = 0; i < typerDivs.length; i++) {
            if (typerDivs[i].classList.contains("visible")) {
                visCount += 1
            }
        }

        return visCount;
    }


    function changeChatVisibility(timing, currentTime) {
        const { txt, timeOut, startTime } = getTextTiming(timing, currentTime)

        // Show/hide this/other windows
        setTimeoutWrapper(
            () => { showWindow(timing.windowId, timing.show, timing.hideOtherWindows) },
            () => { }, startTime);
    }

    function renameChat(timing, currentTime) {
        const { txt, /* unused */ timeOut, startTime } = getTextTiming(timing, currentTime)

        // the chat title associated with the current chat window
        const chatTitle = ELEMENTS.chatwindows.get(timing.windowId)["chat-title"];

        setTimeoutWrapper(() => { chatTitle.innerText = txt; }, () => { }, startTime)
    }

    function whoTypes(timing, currentTime) {
        const windowId = timing.windowId
        const typerDiv = document.getElementById(`typer-${timing.userId}-${windowId}`)

        if (typerDiv === null) {
            return
        }

        const { timeOut, startTime } = getTextTiming(timing, currentTime)

        // get the typing element associated with this window
        const typingElement = ELEMENTS.chatwindows.get(windowId)["typing"];

        setTimeoutWrapper(() => {
            typingElement.classList.add("visible");
            typerDiv.classList.add("visible");
        }, () => {
            typerDiv.classList.remove("visible");
            if (countVisibleTypers(windowId) === 0) {
                typingElement.classList.remove("visible");
            }
        }, timeOut)

        setTimeoutWrapper(() => {
            typerDiv.classList.remove("visible");
            if (countVisibleTypers(windowId) === 0) {
                typingElement.classList.remove("visible");
            }
        }, () => { }, startTime)
    }

    function makeTimings() {
        const chatMessages = ELEMENTS.messages;
        let accTime = 0; // in seconds

        // // preamble timings
        // for (const [id, windowInfo] of ELEMENTS.chatwindows.entries()) {
        //     // Rename the chat window
        //     TIMINGS.push({
        //         timing: accTime,
        //         element,
        //         windowId,
        //         callback: renameChat,
        //     })
        // }


        for (let i = 0; i < chatMessages.length; i++) {
            const element = chatMessages[i]
            const msgType = element.dataset.class
            const userId = element.dataset.user
            const windowId = element.dataset.windowid
            const isPovUser = element.dataset.usertype == "pov"
            const windowInfo = ELEMENTS.chatwindows.get(windowId)

            const delay = parseFloat(element.dataset.timing)
            const defaultPrompt = windowInfo["default-prompt"].textContent

            // Show the message at the appropriate time
            if (msgType == 'msg') {
                TIMINGS.push({
                    timing: accTime,
                    element,
                    windowId,
                    prompt: chatMessages[i + 1] ? chatMessages[i + 1].dataset.prompt || defaultPrompt : defaultPrompt,
                    callback: timeoutModifyMessage,
                })
            }

            switch (msgType) {
                case 'msg':
                    // Who's typing effect
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        userId,
                        windowId,
                        callback: whoTypes,
                    })

                    // POV user typing effect
                    if (isPovUser) {
                        TIMINGS.push({
                            timing: accTime,
                            element,
                            windowId,
                            callback: timeoutTyper,
                        })
                    }
                    break;

                case 'rename':
                    // Rename the current chat window
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        windowId,
                        callback: renameChat,
                    })
                    break;

                case 'switch':
                    // Switch to a different chat window
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        windowId,
                        show: true,
                        hideOtherWindows: true,
                        callback: changeChatVisibility,
                    })
                    break;

                case 'split-add':
                    // Add a different chat window
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        windowId,
                        show: true,
                        hideOtherWindows: false,
                        callback: changeChatVisibility,
                    })
                    break;

                case 'split-remove':
                    // Add a different chat window
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        windowId,
                        show: false,
                        hideOtherWindows: false,
                        callback: changeChatVisibility,
                    })
                    break;

                case 'ignore':
                    // Ignore this message
                    element.classList.remove('visible')
                    break;

                default:
                    break;
            }

            accTime += delay;
        }
    }

    function unhideMessage(currentTime) {
        TIMINGS.forEach((timing) => {
            timing.callback(timing, currentTime)
        })
    }

    function makeAccordians() {
        let acc = document.getElementsByClassName("accordion");
        let i;

        for (i = 0; i < acc.length; i++) {
            acc[i].addEventListener("click", function () {
                this.classList.toggle("active");
                let panel = this.nextElementSibling;
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
            });
        }
    }

    function showWindow(windowId, show, hideOtherWindows) {
        if (show) {
            for (const [id, windowInfo] of ELEMENTS.chatwindows.entries()) {
                const element = windowInfo["window"]
                if (id === windowId) {
                    element.classList.add("visible");
                } else {
                    if (hideOtherWindows) {
                        // This does nothing if it already has that class
                        element.classList.remove("visible");
                    }
                }
            }
        } else {
            ELEMENTS.chatwindows.get(windowId)["window"].classList.remove("visible")
        }
    }

    function showCredits(show) {
        if (show) {
            for (const [id, element] of ELEMENTS.chatwindows.entries()) {
                element["window"].classList.remove("visible");
            }
            ELEMENTS.credits.classList.add("visible");
        } else {
            ELEMENTS.credits.classList.remove("visible");
        }
    }

    showCredits(true)
    ELEMENTS.audioPlayer.addEventListener("play", () => {
        showCredits(false)
        unhideMessage(ELEMENTS.audioPlayer.currentTime)
    })

    ELEMENTS.audioPlayer.addEventListener("ended", () => {
        showCredits(true)
    })

    ELEMENTS.audioPlayer.addEventListener("pause", () => {
        // clear timers
        TIMERS.forEach((timer) => {
            clearTimeout(timer)
        })
        TIMERS = []


        for (const [id, element] of ELEMENTS.chatwindows.entries()) {
            element["typeSpace"].innerText = '';
        }

        //ELEMENTS.typeSpace.innerText = '';
    })

    document.getElementById("lightdark-btn").addEventListener("click", () => {
        document.body.classList.toggle("darkmode")
        if (document.body.classList.contains("darkmode")) {
            document.getElementById("dark-light-current").innerText = "Light"
        } else {
            document.getElementById("dark-light-current").innerText = "Dark"
        }
    })

    makeTimings()
    makeAccordians()
    ELEMENTS.audioPlayer.focus()
})();