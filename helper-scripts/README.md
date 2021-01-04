# Developing your own animation

To develop your own animation, you'll need to do a few things:
1. Create a transcript file (`script.txt`) to indicate which characters say what lines. There are also a few commands you can include in this file to influence how these lines appear.
1. Create a timing file (`timings.txt`) to indicate when the various script lines should appear.
1. Create a metadata file (`template_values.json`). This includes information like where your audio is hosted, what the title is, and who to credit for it.
1. Run the python file `htmlmaker.py`.
1. Open `index.html` in your browser and enjoy!
1. To make the animation public, find somewhere to host the animation and upload `index.html`, `animation.css`, and `animation.js`.

For more details on each step, see below.

## The transcript file (`script.txt`)

There are a few different kinds of lines you can have in `script.txt`:

* Lines *not* associated with timings:
    * *Character lines.* These are of the form `Character name:` and indicate who the next script line(s) is/are from.
    * *Focus lines.* These are of the form `:switch:pov character's name:chat title` and indicate which window the next script line(s) should be in. If at that point in the animation, that particular chat window is not visible to the user (see switch and split lines below), the script lines following this focus line will not appear to the user, although the user will see them the next time you switch or split to this chat window.
    * *Blank lines.* These lines are skipped by `htmlmaker.py`.
    * *Comment lines.* These must start with a '#', and allow you to leave notes to yourself in `script.txt`. These lines are skipped by `htmlmaker.py`.
    * *Override type start.* See below under common issues.

* Lines associated with timings:
    * *Script lines.* These are of the form `Character name: line` or `line`, and will result in a message from `Character name` with the content `line` appearing in the animation. The time associated with a script line indicates how long to wait before showing the next line.
    * *Switch lines.* These lines switch to a new chat window. They are of the form `:switch:new pov character's name:new chat title`. For example, `:switch:Sherlock:Irregulars` could be used to switch to a group chat named `Irregulars`, where the point-of-view character is Sherlock. This means that we'll see a typing animation when Sherlock sends a message, but not when others in that window do. If you switch back to a chat window after having switched away from it, the message history from the previous time the chat window was shown will be preserved. The time associated with these lines is equivalent to the pause before showing the first new message in this window. Showing an animation of the same chat thread but from different point-of-view characters is not supported at this time. A switch line implies a focus line, so the next script line after it will appear in this particular chat window.
    * *Split lines.* These lines split the screen horizontally and add or remove the chat specified in the command. They are of the form `:split-add:pov character:chat title` or `:split-remove:pov character:chat title`. After a split line, there must be a focus or switch line before any new script lines so it is not ambiguous which chat window those messages belong to.

The script will automatically remove white-space before or after character's names, and before or after a script line.

`htmlmaker.py` will let you know if it seems ambiguous what chat window a particular script window belongs to (at the beginning of the script or after a split-add or split-remove command) so that you can add the appropriate switch or focus command. In general, you should be good if you:
* start your script with a switch line
* follow any split-add or split-remove lines with a focus line.

### Fixes for a few common issues:

* If your script line starts with ':' or '#', `htmlmaker.py` will mangle the line unless you make sure to provide a character on that particular line. Example to avoid: `:D`; correct example: `Mary: :D`.
* If you have two messages in a row from the point-of-view character and the second is really long, its typing animation may start before the previous message's typing animation finishes, leading to a jumbled mangle of characters in the typing box. There are two potential fixes:
    * Break up the second message into two or more shorter messages.
    * Add a line of the form `:override-type-start:number` right before the second message. You don't need to (/can't) add a timing for this line. This will ignore the first `number` letters in the typing animation, so it can start later and avoid conflicting with the previous script line. Experiment with different number values to see if this helps. Examples where the script line that follows the override line is `Hello beautiful world!`:
        * `:override-type-start:0`: This is the default, so this wouldn't change anything
        * `:override-type-start:16`: This will show the pov character typing `world!` before their message `Hello beautiful world!` appears
        * `:override-type-start:22`: This will show no typing animation before the character's message appears, since 22 is exactly the length of the message
        * `:override-type-start:-1`: This is invalid since number must be at least 0
        * `:override-type-start:35`: This is invalid since number must be at most the length of the character's message

## The timings file (`timings.txt`)

Each line of `timings.txt` corresponds to a time in decimal seconds. For a script line, this will correspond to how long it takes to say this line in the audio. Any lines that are not a number will be ignored. You can take advantage of this to make notes to yourself about which script lines the various timing lines correspond to, which can be useful to try to figure out where you accidentally merged two times that should be separate or split two times that should correspond to the same line.

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

## The metadata file (`template_values.json`)

This file can be opened in a regular text editor, although if you use an IDE (integrated development environment, used for editing code) it can help you figure out where you forgot a comma if that happens. There are also json editors available online, for example this [json editor](https://jsoneditoronline.org/).

This is used to make links and display various other metadata associated with your animation in the generated html page.

### Troubleshooting

The json format is pretty strict, so there are a few ways you might trip up.
* In any list, everything in the list must be followed by a comma, except the last item which must *not* be followed by a comma.
* In any string (everything between a pair of double quotes), no double quotes are allowed unless you put a \ right before them. Example of what not to do: `"Hello "World""`; correct example: `"Hello \"World\""`.

##  Running the python file (`htmlmaker.py`)

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
