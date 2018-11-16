# markup-warnings

Helper to highlight inaccessible markup.

## Usage

Add this Bookmarklet to your browser:

* Name: Markup warnings
* URL: `javascript:(function(d,id,el){el=d.getElementById(id);if(el){d.head.removeChild(el)}else{el=d.createElement('link');el.rel='stylesheet';el.id=id;el.href='https://unpkg.com/markup-warnings';el.setAttribute('data-project-homepage','https://github.com/georgeadamson/markup-warnings');d.head.appendChild(el)}})(document,'_markup-warnings_')`

Tip: Sometimes Chrome will strip off the "javascript:" prefix when you paste the URL, make sure it's still there.


## To develop this project

### Requirements

**[Node.js](http://nodejs.org) v4.x.x - v6.9.x .**


```bash
$ git clone https://github.com/georgeadamson/markup-warnings.git
$ cd markup-warnings
$ npm install
$ gulp
```
