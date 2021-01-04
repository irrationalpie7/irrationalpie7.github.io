from jinja2 import FileSystemLoader, Environment, select_autoescape, StrictUndefined
import json
import sys
import html
SCRIPT_PATH = r'biscuit1-1.txt'
TEMPLATE_VALUES_PATH = r'biscuitverse6.json'
TEMPLATE_PATH = r'template.html.j2'
TIMINGS_PATH = r'timings.txt'
HTML_LINES_PATH = r'index.html'


# Keep track of characters in the animation.
userToId = {"": ""}


def getOrCreateUserId(userName):
    """
    Get or create a user id for this character.
    """
    userId = userToId.get(userName)
    if not userId:
        nextUserNumber = len(userToId)
        userToId[userName] = f'user{nextUserNumber}'
    return userToId[userName]


# Keep track of chat windows in the animation.
windowToId = {}
windowIdToPovUser = {}
windowIdToTitle = {}
windowIdToTheme = {}
messages = {}
promptdivs = {}
default_prompt = {}


def createWindowId(alias, theme, povUser, windowTitle, i):
    """
    Create a window id for this chat.
    """
    uniqueTitle = alias
    windowId = windowToId.get(uniqueTitle)
    if windowId:
        print(
            f'\nError creating chat with alias "{alias}" on line {i} of script.txt--this alias is already taken.')
        sys.exit()
    if not windowId:
        nextWindowId = len(windowToId)
        windowId = f'window{nextWindowId}'
        windowIdToPovUser[windowId] = povUser
        windowToId[uniqueTitle] = windowId
        messages[windowId] = []
        windowIdToTitle[windowId] = html.escape(
            windowTitle).replace('  ', '&nbsp;&nbsp;')
        # console or texting prompt options:
        if theme == "texting":
            windowIdToTheme[windowId] = "texting"
            space = ""
            cursor = "|"
            prompttext = ""
            default_prompt[windowId] = ""
        else:
            windowIdToTheme[windowId] = "console"
            space = "&nbsp;"
            cursor = "&block;"
            prompttext = "&gt;&gt;"
            default_prompt[windowId] = ">>"
        promptdivs[windowId] = f'<div id="prompt-box-{windowId}" class="prompt-box"><span id="prompt-{windowId}" class="prompt">{prompttext}</span>{space}<span id="typewriter-space-{windowId}" class="typewriter-space"></span><span id="dc-cursor" class="cursor">{cursor}</span></div>'
    return windowId

# Functions to help parse script lines.


def printMessage(msg):
    """
    Pretty-print a message
    """
    if msg["type"] == "msg":
        return f'{msg["id"]}:{msg["userinfo"]["name"]}:{msg["metadata"]["timing"]}:{msg["content"]}'
    return f'{msg["id"]}:{msg["type"]}:{msg["metadata"]["timing"]}:{windowIdToTitle[msg["metadata"]["windowId"]]}'


def parseLine(line, i, prevUserName, prevWindowId, typeStartOverride):
    """
    Parse this line of script.txt into a message
    (which is just a dict, because I don't know how to python)
    """
    # Create a stub message with default values
    msg = {"type": "",
           "id": f'msg{i:05d}',
           "userinfo": {"id": "", "name": "", "type": "nonpov"},
           "metadata": {"timing": "", "typeStart": typeStartOverride, "windowId": prevWindowId},
           "content": ""}
    cleanline = line.strip()

    # Ignore lines with only whitespace, or that start with '#'
    if len(cleanline) < 1 or line.startswith("#"):
        msg["type"] = "skip"
        return msg

    # process special commands
    if cleanline.startswith(":"):
        cleanline = cleanline[1:]
        cmd = cleanline.split(':', 1)
        cmdName = cmd[0].strip()
        if cmdName == 'create':
            msg["type"] = 'create'
            # <chat window alias>:<theme>:<pov character>:<chat title>
            cmd = cmd[1].split(':', 3)
            alias = cmd[0].strip()
            theme = cmd[1].strip()
            povUser = cmd[2].strip()
            windowTitle = cmd[3].strip()
            msg["metadata"]["windowId"] = createWindowId(
                alias, theme, povUser, windowTitle, i)
            return msg
        elif cmdName == 'switch' or cmdName == 'split-add' or cmdName == 'split-remove' or cmdName == 'focus':
            msg["type"] = cmd[0].strip()
            # the new chat's name
            alias = cmd[1].strip()
            try:
                msg["metadata"]["windowId"] = windowToId[alias]
            except KeyError:
                print(
                    f'\nError: Tried to {cmdName} with unknown chat alias "{alias}" on line {i} of script')
                sys.exit()
            return msg
        elif cmdName == "override-type-start":
            msg["type"] = "override-type-start"
            try:
                msg["metadata"]["typeStart"] = int(cmd[1].strip())
            except ValueError:
                # ignore this line since it's not a number
                print(
                    f'\nError on script line {i}: override-type-start must be a number.')
                sys.exit()
            return msg
        elif cmdName == "characters":
            msg["type"] = "skip"
            names = cmd[1].split(":")
            for name in names:
                getOrCreateUserId(name)
            return msg
        elif len(cleanline) < 1:
            # this allows you to include a line for timing purposes
            # without showing anything in the animation
            msg["type"] = 'ignore'
        else:
            # false alarm, this wasn't actually a command
            cleanline = f':{cleanline}'

    # process regular message line
    msg["type"] = 'msg'
    potentialsplit = cleanline.split(':', 1)
    # if the first part of this line is a known user, update that info
    # otherwise, keep using the previously specified user.
    if userToId.get(potentialsplit[0].strip()):
        msg["userinfo"]["id"] = userToId[potentialsplit[0].strip()]
        msg["userinfo"]["name"] = potentialsplit[0].strip()
        msg["content"] = potentialsplit[1].strip()
        # if there's actually no message on this line, skip it
        if msg["content"] == '':
            msg["type"] = "character"
            return msg
    else:
        msg["userinfo"]["id"] = userToId[prevUserName]
        msg["userinfo"]["name"] = prevUserName
        msg["content"] = cleanline

    if len(msg["content"]) < msg["metadata"]["typeStart"]:
        msg["metadata"]["typeStart"] = len(msg["content"])

    if prevWindowId == "":
        print(
            f'\nError on script line {i}: Unclear which chat window this script line belongs to.')
        print('You may have forgotten to add a focus or switch command after a create, split-add, or split-remove command')
        sys.exit()

    povUser = windowIdToPovUser[prevWindowId]
    curUser = msg["userinfo"]["name"]
    if curUser == povUser and curUser != "":
        msg["userinfo"]["type"] = "pov"
    else:
        msg["userinfo"]["type"] = "nonpov"
    if windowIdToTheme[prevWindowId] == "console":
        msg["prompt"] = f'{povUser}>'
    else:
        msg["prompt"] = ""
#    prompt=f'{povUser}>'

    return msg


# Read in the script
with open(SCRIPT_PATH, 'rb') as fh:
    tmplines = fh.read()

# Read in the timings, skipping lines that aren't numbers.
with open(TIMINGS_PATH) as fh:
    templines = fh.readlines()
    timinglines = []
    for line in templines:
        cleanline = line.strip()
        try:
            timinglines.append(float(cleanline))
        except ValueError:
            # ignore this line since it's not a number
            pass

# Convert between fancy quotes and regular quotes.
tmplines = tmplines.decode(
    'utf-8').replace('’', "'").replace('“', '"').replace("”", '"')
scriptlines = tmplines.splitlines()

# Go through script.txt line by line and figure out what each line *means*
timingIndex = 0
curUser = ''
curWindowId = ''
typeStartOverride = 0
sanityCheck = ''
for i, line in enumerate(scriptlines):
    # undocumented personal override
    # in chapter 1 there's definitely no implied switching, so we'll ignore that for now.
    if line.startswith("@@"):
        cleanline = line[2:]
        cmd = cleanline.split(":", 1)
        curUser = cmd[0].strip()
        continue

    msg = parseLine(line, i + 1, curUser, curWindowId, typeStartOverride)

    # Update curUser and curWindowId based on msg, and decide whether we're
    # already done with msg and should continue to the next line of script.txt.
    if msg["type"] == "skip":
        continue
    if msg["type"] == "character":
        curUser = msg["userinfo"]["name"]
        continue
    if msg["type"] == "focus":
        curWindowId = msg["metadata"]["windowId"]
        continue
    if msg["type"] == "create":
        # Clear this out so we can warn people running htmlmaker.py about which
        # chat window their next messages will go in if they forget to follow up
        # with a 'switch' or 'focus'
        curWindowId = ""
        continue
    if msg["type"] == "override-type-start":
        typeStartOverride = msg["metadata"]["typeStart"]
        continue

    if msg["type"] == "switch":
        curWindowId = msg["metadata"]["windowId"]
    if msg["type"] == "msg":
        curUser = msg["userinfo"]["name"]
        # Clear this out so the next message starts back at default
        typeStartOverride = 0
    if msg["type"] == "split-add" or msg["type"] == "split-remove":
        # Clear this out so we can warn people running htmlmaker.py about which
        # chat window their next messages will go in if they forget to follow up
        # with a 'switch' or 'focus'
        curWindowId = ""

    # check or override type start

    # Add this message to its chat window:
    msg["content"] = html.escape(msg["content"]).replace('  ', '&nbsp;&nbsp;')
    msg["userinfo"]["name"] = html.escape(
        msg["userinfo"]["name"]).replace('  ', '&nbsp;&nbsp;')
    msg["metadata"]["timing"] = timinglines[timingIndex]
    timingIndex += 1
    messages[msg["metadata"]["windowId"]].append(msg)

    # Record some lines as a sanity spot-check
    if timingIndex < 5 or timingIndex % (len(timinglines)//10) == 0:
        sanityCheck = f'{sanityCheck}\n{printMessage(msg)}'

# It was convenient to have an empty user before, but now we want it gone.
userToId.pop("", None)
print(f'\nDetected {len(userToId)} characters:')
for userName, userId in userToId.items():
    print(f' * {userName}')

print(f'\nDetected {len(windowToId)} chat windows:')
for alias, windowId in windowToId.items():
    print(f' * {alias}: {windowIdToTitle[windowId]}')

print('\nSome timing/script line matchups from the beginning and throughout to help you')
print(f'sanity-check your script.txt/timings.txt files:{sanityCheck}')

with open(TEMPLATE_VALUES_PATH) as fh:
    template_values = json.load(fh)

# Write out index.html
env = Environment(loader=FileSystemLoader('.'),
                  autoescape=select_autoescape(['html', 'xml']),
                  undefined=StrictUndefined)
template = env.get_template(TEMPLATE_PATH)
output = template.render(template_values=template_values, users=userToId,
                         chat_titles=windowIdToTitle, messages=messages,
                         prompt=promptdivs, default_prompt=default_prompt, cursor="",
                         theme=windowIdToTheme["window0"])

with open(HTML_LINES_PATH, 'w+') as fh:
    fh.write(output)
