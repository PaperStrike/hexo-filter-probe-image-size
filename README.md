# hexo-filter-probe-image-size

Probe and set `width` and `height` to `<img>` elements.

As [modern best practice - Optimize Cumulative Layout Shift | web.dev](https://web.dev/optimize-cls/#modern-best-practice) describes, always set the `width` and `height` attributes without units in HTML, and set one of them to `auto` in CSS.

## Usage

Available configurations and default values. Configure them in Hexo `_config.yml`.

All paths, if not marked `external`, base on the generating folder (usually the `public` folder after generated).

```yaml
# Probe <img> sizes and set related attributes.
probe_image_sizes:

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
      match: ^(https?:)?//.+/(?=[^/]+$)

      # The string that replaces the substring
      # specified by the specified RegExp.
      # Based on the generating folder.
      target: /images/

      # Make the resolved path base on the file system,
      # to probe image sizes by using files outside.
      # Not used if resolving to HTTP URLs.
      # E.g., when targeting /home/foo/Pictures/ (on Linux)
      # or D:/Pictures/ (on Windows).
      # Optional, default to false
      external: false
```

## Examples

### Proxy specific URL

For files in my own image CDN `https://example/img/`, use `/home/demo/Pictures/`:

```yaml
probe_image_sizes:
  enable: true
  proxies:
    - name: My CDN
      match: ^https://example/img/
      target: /home/demo/Pictures/
      external: true
```

### Proxy specific files

For files with a name prefixed by `Primo-`, use `/home/demo/Primo/pics/`:

```yaml
probe_image_sizes:
  enable: true
  proxies:
    - name: El Primo
      match: ^.+/(?=Primo-[^/]+$)
      target: /home/demo/Primo/pics/
      external: true
```

### Proxy fallbacks

For files failed to access in previous proxy, use `/a/path/expected/to/contains/all/images/`, and if failed again, use the original path:

```yaml
probe_image_sizes:
  enable: true
  proxies:
    - name: Example that flat the path
      match: ^.+/(?=[^/]+$)
      target: /images/
    # when proxy above failed to target a parsable image.
    - name: All images
      match: ^.+/(?=[^/]+$)
      target: /a/path/expected/to/contains/all/images/
      external: true
    # Use original image path if all previous ones failed.
    - name: Original
      # Match all, as all paths contain the empty string.
      match: ''
      target: ''
```

### Runs later than others

_See [Filter | Hexo](https://hexo.io/api/filter#Synopsis) for filter priority description._

As most of Hexo filters use a priority of 10, setting it to 9 or 11 makes our probe process runs earlier or later than them.

```yaml
probe_image_sizes:
  enable: true
  priority: 11
```

Or manage the order totally on your own.

```yaml
some_other_plugin_that_also_supports_priority:
  priority: 11

probe_image_sizes:
  enable: true
  priority: 12
```

## [LICENSE](LICENSE)
