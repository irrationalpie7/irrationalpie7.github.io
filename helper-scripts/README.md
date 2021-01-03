# Developing your own animation

To develop your own animation, you'll need to create `script.txt` and `timings.txt` files, and fill in `template_values.json` with metadata associated with your animation.

Then, you'll run the `htmlmaker.py` script, which will generate `index.html`. The script also requires `template.html.j2` to exist, but you should not need to edit that file.

Once you have an `index.html` file, you'll be able to view it by directly opening it with a browser to make sure it looks the way you expect.

Finally, you'll host `animation.css`, `animation.js`, and the generated `index.html`, and then you'll have your animation!

## `script.txt`

There are a few different kinds of lines you can have in `script.txt`:

* Lines *not* associated with timings:
    * *Character lines.* These are of the form `Character name:` and indicate who the next script line(s) is/are from.
    * *Blank lines.* These lines are skipped by the `htmlmaker.py`.
    * *Comment lines.* These must start with a '#', and allow you to leave notes to yourself in `script.txt`. These lines are skipped by `htmlmaker.py`.

* Lines associated with timings:
    * *Script lines.* These are of the form `Character name: line` or `line`, and will result in a message from `Character name` with the content `line` appearing in the animation. The time associated with a script line indicates how long to wait before showing the next line.
    * *Switch lines.* These lines switch to a new chat window. *The first line of your script must be a switch line.* They are of the form `:switch:new pov character's name:new chat title`. For example, `:switch:Sherlock:Irregulars` could be used to switch to a group chat named `Irregulars`, where the point-of-view character is Sherlock. This means that we'll see a typing animation when Sherlock sends a message, but not when others in that window do. If you switch back to a chat window after having switched away from it, the message history from the previous time the chat window was shown will be preserved. The time associated with these lines is equivalent to the pause before showing the first new message in this window. Animating different chat windows with the same name but different point-of-view characters is not supported at this time.

The script will automatically remove white-space before or after character's names, and before or after a script line.

### Fixes for a few common issues:

* If your script line starts with ':' or '#', `htmlmaker.py` will mangle the line unless you make sure to provide a character on that particular line. Example to avoid: `:D`; correct example: `Mary: :D`.
* If you have two messages in a row from the point-of-view character and the second is really long, its typing animation may start before the previous message's typing animation finishes, leading to a jumbled mangle of characters in the typing box. The fix for this is to break up the second message into two or more shorter messages. Alternatively, you can poke around in the generated html, find the `message-container` containing the second message, and increase the number associated with `data-type-start` until you stop seeing this issue. Unfortunately, re-generating the html will wipe out these changes, so this is not recommended.

## `timings.txt`

Each line of `timings.txt` corresponds to a time in decimal seconds. Any lines that are not a number will be ignored. You can take advantage of this to make notes to yourself about which script lines the various timing lines correspond to, which can be useful when to try to figure out where you accidentally merged two times that should be separate or split two times that should correspond to the same line.

### Aesthetic note
Imagine you have the following script:
```
Mary:
Hi there!
It's a lovely day today
John:
Hi!
It is indeed
```
Although it's somewhat counter-intuitive, I find the animation looks smoother if you split the part around John into segments like
```
It's a lovely day today John: | Hi! | It is indeed
```
rather than
```
It's a lovely day today | John: Hi! | It is indeed
```

If you do it the first way, the audio for "John" will line up with the typing indicator with John's name, and the audio for "Hi!" will line up with the message appearing. If you do it the second way, the line "Hi!" will show up while the audio is still saying "John". If your audio is already all nicely divided, though, it's probably not worth going back and changing >.<

### Generating `timings.txt`

This is one of the more tedious parts of coming up with an animation. Below are two different methods which may be useful in making this easier.

#### Using labels in Audacity
1. (optional) Use "Analyze > Silence finder..." to try to find breaks between speaking roles--this adds a bunch of labels with label "S"
2. Go through and remove extra labels/add missing ones (if you click the label track in audacity, then start playing, you can use alt + left/right arrow to jump to the next/previous label to make this process go faster)
3. Export the label track and copy the result to a spreadsheet
4. Add a column to the spreadsheet that calculates the difference between consecutive label start times, then copy that column to the timing file.
    * If you go this route, it may be easier to leave notes to yourself in the spreadsheet, rather than putting them directly in timings.txt

#### Using splits in Audacity

1. Cut up the audio using ctrl+i, so that each segment represents a script or switch line. (You can also turn labels into cut segments by selecting the audio track and the label track, then doing "Edit > Clip boundaries > Split", but unfortunately I haven't been able to figure out a way to go from split audio to labels)
1. Double click to select each segment and read the length of the segment from the numbers at the bottom of the screen, adding them to timings.txt

## `template_values.json`

This file can be opened in a regular text editor, although if you use an IDE (integrated development environment, used for editing code) it can help you figure out where you forgot a comma if that happens.

This is used to make links and display various other metadata associated with your animation in the generated html page.

### Troubleshooting

The json format is pretty strict, so there are a few ways you might trip up.
* In any list, everything in the list must be followed by a comma, except the last item which must *not* be followed by a comma.
* In any string (everything between a pair of double quotes), no double quotes are allowed unless you put a \ right before them. Example of what not to do: `"Hello "World""`; correct example: `"Hello \"World\""`.

## `htmlmaker.py`

Depending on your operating system, the way you install and use python and pip will vary, so go look that up first if you don't have them. Note that this script uses Python 3, not Python 2. It also depends on jinja2, which can be installed with pip.

The current version of the script requires you to specify whether you're creating an animation with a "console" or "texting" theme, then provide the character names as arguments to this script.
Usage:
```
python3 htmlmaker.py "texting|console" "Character 1 name" "Character 2 name" "Character N name"
```
Example:
```
python3 htmlmaker.py "texting" "Sherlock" "Mary"
```

The script requires that the three other files are in the same folder. It will print out some sanity-check lines in the console so you can confirm whether the script lines and timing lines are lining up correctly. It will also generate an `index.html` file.

To see the animation, put `index.html` in the same folder as `animation.js` and `animation.css`, then open it in your browser and enjoy!
