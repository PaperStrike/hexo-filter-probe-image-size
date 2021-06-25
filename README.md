# hexo-filter-probe-image-size

[![npm package](https://img.shields.io/npm/v/hexo-filter-probe-image-size)](https://www.npmjs.com/package/hexo-filter-probe-image-size)

Probe and set `width` and `height` to `<img>` elements.

As [modern best practice - Optimize Cumulative Layout Shift | web.dev](https://web.dev/optimize-cls/#modern-best-practice) describes, developers should always set the `width` and `height` attributes without units in HTML, and set one of them to `auto` in CSS.

Core: [nodeca/probe-image-size](https://github.com/nodeca/probe-image-size).

---

🐿️ Jump to [Examples](#examples), [Q&A][q-a], or [Contributing Guide][contributing].

## Usage

Available configurations and default values. Configure them in Hexo `_config.yml`.

```yaml
# Probe <img> sizes and set related attributes.
probe_image_size:

  enable: false

  # https://hexo.io/api/filter#Synopsis
  priority: 10

  # An array containing the rules to resolve an image path.
  # If an image matches multiple proxy rules, the resolved
  # paths will be probed in order until one gives a size.
  proxies:

    # By default, we use the local image that has the same
    # file name instead of do a real HTTP request to probe.
    - name: HTTP to local

      # A regex or string used to specify substrings
      # that are replaced with the specified target string.
      match: ^(https?:)?//.+/

      # The string that replaces the substring
      # specified by the match above.
      target: images/
```

When resolving an image path (usually grabbed from `<img>`s' `src` attributes), this filter firstly checks if the path matches `^(https?:)?//`. If not, will format it to a _relative_ path that has no query string.

By using _proxies_, you can resolve these possibly formatted paths back to _absolute_ paths. Proxy-resolved absolute paths represent files from the file system. E.g., `/home/foo/Pictures/` does represent `/home/foo/Pictures/` on POSIX, and `D:/home/foo/Pictures/` on Windows (assume you run Hexo in `D:`), instead of the one based on the generating folder.

The whole process won't mutate any original `src` values.

## Examples

### Proxy specific URL

For files in my own image CDN `https://example/img/`, use `/home/demo/Pictures/`:

```yaml
probe_image_size:
  enable: true
  proxies:
    - name: My CDN
      match: ^https://example/img/
      target: /home/demo/Pictures/
```

### Proxy specific files

For files with a name prefixed by `Primo-`, use `D:/Primo/pics/`:

```yaml
probe_image_size:
  enable: true
  proxies:
    - name: El Primo
      match: ^.+/(?=Primo-[^/]+$)
      target: D:/Primo/pics/
```

### Proxy fallbacks

For files failed to access in previous proxy, use `/a/path/expected/to/contain/all/images/`, and if failed again, use the original path:

```yaml
probe_image_size:
  enable: true
  proxies:
    - name: HTTP to local
      match: ^(https?:)?//.+/
      target: images/
    # When proxy above failed to target a parsable image.
    - name: All images folder
      match: ^.+/
      target: /a/path/expected/to/contain/all/images/
    # When above failed, too.
    - name: Try Original
      # Match all, as all paths contain the empty string.
      match: ''
      target: ''
```

### No proxy

Use the original path directly:

```yaml
probe_image_size:
  enable: true
  proxies: []
```

### Run later than others

_See [Filter | Hexo](https://hexo.io/api/filter#Synopsis) for filter priority description._

As most of Hexo filters use a priority of 10, setting it to 9 or 11 makes our probe process runs earlier or later than them.

```yaml
probe_image_size:
  enable: true
  priority: 11
```

Or manage the order totally on your own.

```yaml
some_other_filter_that_also_supports_priority:
  priority: 11

probe_image_size:
  enable: true
  priority: 12
```

## [Q&A][q-a]

## [CONTRIBUTING][contributing]

## [LICENSE](LICENSE)

[q-a]: https://github.com/PaperStrike/hexo-filter-probe-image-size/discussions/categories/q-a
[contributing]: https://github.com/PaperStrike/hexo-filter-probe-image-size/blob/main/.github/CONTRIBUTING.md
