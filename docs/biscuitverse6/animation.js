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
        chatbox: document.getElementById("chatbox"),
        chattitle: document.getElementById("chat-title"),
        prompt: document.getElementById("prompt"),
        typeSpace: document.getElementById("typewriter-space"),
        typing: document.getElementById("typing"),
        typers: document.getElementById("typers"),
        appContainer: document.getElementById("droidchat"),
        audioPlayer: document.getElementById("audio"),
        defaultPrompt: document.getElementById("default-prompt")
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
        const display = timing.display;
        setTimeoutWrapper(() => {
            element.classList.add("visible");
            ELEMENTS.prompt.innerText = promptText;
        }, () => {
            element.classList.remove("visible");
        }, time)
    }

    function getTextTiming(timing, currentTime) {
        const txtStart = parseInt(timing.element.getAttribute('data-type-start'))
        const txt = timing.element.firstElementChild.lastElementChild.innerText.slice(txtStart)
        const startTime = timing.timing - currentTime
        const timeOut = startTime - txt.length * TYPE_SPEED / 1000 - SEND_DELAY / 1000

        return { txt, timeOut, startTime }
    }

    function timeoutTyper(txtObj, currentTime) {
        const typingElement = ELEMENTS.typeSpace;
        const { txt, timeOut, startTime } = getTextTiming(txtObj, currentTime)

        if (timeOut < 0) {
            return;
        }
        for (let i = 0; i < txt.length; i++) {
            const letter = txt.charAt(i)
            // console.log(timeOut)
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

    function countVisibleTypers() {
        const typerDivs = ELEMENTS.typers.children;
        let visCount = 0;

        for (let i = 0; i < typerDivs.length; i++) {
            if (typerDivs[i].classList.contains("visible")) {
                visCount += 1
            }
        }

        return visCount;
    }

    function switchChat(timing, currentTime) {
        const { txt, /* unused */ timeOut, startTime } = getTextTiming(timing, currentTime)

        const chatMessages = ELEMENTS.chatbox.children;

        setTimeoutWrapper(() => {
            ELEMENTS.chattitle.innerText = txt;
        }, () => { }, startTime)

        const hidingClass = "hiddenBySwitch"
        const thisSwitch = "switch" + timing.index
        // hide previous messages
        for (let i = 0; i < timing.index; i++) {
            const message = chatMessages[i]
            setTimeoutWrapper(() => {
                message.classList.add(hidingClass);
                message.classList.add(thisSwitch)
            }, () => {
                message.classList.remove(thisSwitch)
                for (let i = 0; i < message.classList.length; i++) {
                    const className = message.classList[i]
                    if (className.startsWith("switch")) {
                        return;
                    }
                }
                message.classList.remove(hidingClass);
            }, startTime)
        }

    }

    function renameChat(timing, currentTime) {
        const { txt, /* unused */ timeOut, startTime } = getTextTiming(timing, currentTime)

        setTimeoutWrapper(() => {
            ELEMENTS.chattitle.innerText = txt;
        }, () => { }, startTime)
    }

    function whoTypes(timing, currentTime) {
        const typerDiv = document.getElementById(`typer-${timing.user}`)

        if (typerDiv === null) {
            return
        }

        const { timeOut, startTime } = getTextTiming(timing, currentTime)

        setTimeoutWrapper(() => {
            ELEMENTS.typing.classList.add("visible");
            typerDiv.classList.add("visible");
        }, () => {
            typerDiv.classList.remove("visible");
            if (countVisibleTypers() === 0) {
                ELEMENTS.typing.classList.remove("visible");
            }
        }, timeOut)

        setTimeoutWrapper(() => {
            typerDiv.classList.remove("visible");
            if (countVisibleTypers() === 0) {
                ELEMENTS.typing.classList.remove("visible");
            }
        }, () => { }, startTime)
    }

    function makeTimings() {
        const chatMessages = ELEMENTS.chatbox.children;
        let accTime = 0; // in seconds

        for (let i = 0; i < chatMessages.length; i++) {
            const element = chatMessages[i]
            const msgType = element.getAttribute('data-class')
            const userId = element.getAttribute('data-user')

            const delay = parseFloat(element.getAttribute('data-timing'))
            const defaultPrompt = ELEMENTS.defaultPrompt.textContent
            if (msgType != 'ignore' && msgType != 'switch') {
                TIMINGS.push({
                    timing: accTime,
                    element,
                    prompt: chatMessages[i + 1] ? chatMessages[i + 1].getAttribute('data-prompt') || defaultPrompt : defaultPrompt,
                    display: "flex",
                    callback: timeoutModifyMessage,
                })
            }

            switch (msgType) {
                case 'msg':

                    // user name
                    const user = element.firstElementChild.firstElementChild.innerText;
                    // who's typing effect
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        user,
                        callback: whoTypes,
                    })

                    // POV user typing effect
                    if (userId === 'user0') {
                        TIMINGS.push({
                            timing: accTime,
                            element,
                            display: "",
                            callback: timeoutTyper,
                        })
                    }

                    break;
                case 'K2cmd':

                    TIMINGS.push({
                        timing: accTime,
                        element,
                        display: "",
                        callback: timeoutTyper,
                    })

                    break;
                case 'switch':
                    TIMINGS.push({
                        timing: accTime,
                        element,
                        index: i,
                        display: "",
                        callback: switchChat,
                    })
                case 'ignore':
                    element.classList.remove('visible')
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

    function showCredits(show) {
        if (show) {
            ELEMENTS.appContainer.classList.remove("visible");
            ELEMENTS.credits.classList.add("visible");
        } else {
            ELEMENTS.appContainer.classList.add("visible");
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

        ELEMENTS.typeSpace.innerText = '';
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
})();
