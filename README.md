# markup-warnings

Simple helper to highlight inaccessible markup.

![Example of empty title attribute warning](assets/images/markup-warnings-empty-title.png)

![Example of title and aria-label warning](assets/images/markup-warnings-title-and-aria-label.png)

Currently this POC only uses CSS Selectors to locate problem markup. To be more comprehensive we'll need the help of Javascript in a future version.

## Usage

Add this Bookmarklet to your browser:

* Name: Markup warnings
* URL: `javascript:(function(d,id,el){if(el=d.getElementById(id)){d.head.removeChild(el)}else{el=d.createElement('link');el.rel='stylesheet';el.id=id;el.href='https://unpkg.com/markup-warnings';el.setAttribute('data-project-homepage','https://github.com/georgeadamson/markup-warnings');d.head.appendChild(el)}})(document,'_markup-warnings_')`

Tip: Sometimes Chrome will strip off the "javascript:" prefix when you paste the URL, make sure it's still there.

![Bookmarklet dialog in Chrome](assets/images/markup-warnings-add-bookmarklet-chrome.png)


## To develop this project

### Requirements

**[Node.js](http://nodejs.org) v4.x.x - v6.9.x .**


```bash
$ git clone https://github.com/georgeadamson/markup-warnings.git
$ cd markup-warnings
$ npm install
$ gulp
```
