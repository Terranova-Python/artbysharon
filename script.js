// Initialize and update visitor counter
(function () {
  const counterElement = document.querySelector("#visitorCount");
  const storageKey = "visitorCount";
  
  // Get current count from localStorage or start at 25
  let count = parseInt(localStorage.getItem(storageKey)) || 32;
  
  // Increment count
  count++;
  
  // Save updated count
  localStorage.setItem(storageKey, count);
  
  // Update display
  if (counterElement) {
    counterElement.textContent = count;
  }
})();

(function () {
  const imagePattern = /\.(png|apng|jpg|jpeg|webp|gif)$/i;
  const manifestUrl = new URL("art-manifest.json", document.baseURI);

  const weeklyImage = document.querySelector("#weeklyImage");
  const weeklyEmpty = document.querySelector("#weeklyEmpty");
  const weeklyTitle = document.querySelector("#weeklyTitle");
  const galleryGrid = document.querySelector("#galleryGrid");
  const galleryEmpty = document.querySelector("#galleryEmpty");
  const galleryLoadMore = document.querySelector("#galleryLoadMore");
  const surfacesGrid = document.querySelector("#surfacesGrid");
  const surfacesEmpty = document.querySelector("#surfacesEmpty");
  const surfacesLoadMore = document.querySelector("#surfacesLoadMore");
  const template = document.querySelector("#galleryItemTemplate");
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = document.querySelector("#lightboxImage");
  const lightboxTitle = document.querySelector("#lightboxTitle");
  const closeButton = document.querySelector(".lightbox-close");
  const previousButton = document.querySelector(".lightbox-nav.previous");
  const nextButton = document.querySelector(".lightbox-nav.next");
  const pageSize = 8;

  const galleryState = {
    main: {
      id: "main",
      items: [],
      rendered: 0,
      grid: galleryGrid,
      empty: galleryEmpty,
      loadMore: galleryLoadMore,
      loadMoreText: "Load more artwork"
    },
    surfaces: {
      id: "surfaces",
      items: [],
      rendered: 0,
      grid: surfacesGrid,
      empty: surfacesEmpty,
      loadMore: surfacesLoadMore,
      loadMoreText: "Load more surface art"
    }
  };

  let lightboxItems = [];
  let activeIndex = 0;

  const safeDecode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  };

  const prettifyTitle = (value) => {
    const fileName = safeDecode(value.split("/").pop() || "Artwork");
    return fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const normalizeImage = (file) => {
    const src = file.path || file.src || file.url || "";

    return {
      src,
      title: file.title || prettifyTitle(file.name || src),
      name: file.name || src.split("/").pop() || "Artwork",
      modified: file.modified || ""
    };
  };

  const uniqueImages = (items) => {
    const seen = new Set();

    return items.filter((item) => {
      if (!item.src || seen.has(item.src) || !imagePattern.test(item.src)) {
        return false;
      }

      seen.add(item.src);
      return true;
    });
  };

  const sortNewestByName = (items) =>
    [...items].sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  const loadManifest = async () => {
    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Manifest unavailable");
      }

      return await response.json();
    } catch (error) {
      return { weekly: [], gallery: [], surfaces: [] };
    }
  };

  const setWeeklyArt = (image) => {
    if (!image) {
      weeklyImage.hidden = true;
      weeklyEmpty.hidden = false;
      weeklyTitle.textContent = "A new piece is getting framed";
      return;
    }

    weeklyImage.src = image.src;
    weeklyImage.alt = image.title;
    weeklyImage.hidden = false;
    weeklyEmpty.hidden = true;
    weeklyTitle.textContent = image.title;
  };

  const updateLoadMore = (gallery) => {
    const remaining = gallery.items.length - gallery.rendered;

    if (remaining <= 0) {
      gallery.loadMore.hidden = true;
      return;
    }

    gallery.loadMore.hidden = false;
    gallery.loadMore.textContent = `${gallery.loadMoreText} (${remaining} more)`;
  };

  const createGalleryNode = (gallery, image, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const button = node.querySelector(".gallery-button");
    const img = node.querySelector("img");
    const title = node.querySelector(".piece-title");
    const tilt = ((index % 5) - 2) * 0.7;

    node.style.setProperty("--tilt", `${tilt}deg`);
    node.style.setProperty("--reveal-rotate", `${tilt}deg`);
    button.dataset.gallery = gallery.id;
    button.dataset.index = String(index);
    img.src = image.src;
    img.alt = image.title;
    img.loading = "lazy";
    img.decoding = "async";
    title.textContent = image.title;

    return node;
  };

  const renderNextPage = (gallery) => {
    const fragment = document.createDocumentFragment();
    const start = gallery.rendered;
    const end = Math.min(start + pageSize, gallery.items.length);

    gallery.items.slice(start, end).forEach((image, offset) => {
      fragment.appendChild(createGalleryNode(gallery, image, start + offset));
    });

    gallery.grid.appendChild(fragment);
    gallery.rendered = end;
    observeReveals(gallery.grid.querySelectorAll(".reveal:not(.is-visible)"));
    updateLoadMore(gallery);
  };

  const scrollToCurrentHash = () => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      return;
    }

    const target = document.getElementById(safeDecode(hash));
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
  };

  const setGallery = (gallery, images) => {
    gallery.grid.replaceChildren();
    gallery.items = images;
    gallery.rendered = 0;

    if (!images.length) {
      gallery.empty.classList.add("is-visible-empty");
      gallery.loadMore.hidden = true;
      revealNow(gallery.empty);
      return;
    }

    gallery.empty.classList.remove("is-visible-empty");
    renderNextPage(gallery);
  };

  const openLightbox = (items, index) => {
    lightboxItems = items;
    activeIndex = index;
    const image = lightboxItems[activeIndex];

    if (!image) {
      return;
    }

    lightboxImage.src = image.src;
    lightboxImage.alt = image.title;
    lightboxTitle.textContent = image.title;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  };

  const moveLightbox = (step) => {
    if (!lightboxItems.length) {
      return;
    }

    const nextIndex = (activeIndex + step + lightboxItems.length) % lightboxItems.length;
    openLightbox(lightboxItems, nextIndex);
  };

  const revealNow = (element) => {
    element.classList.add("is-visible");
  };

  let revealObserver;
  const observeReveals = (elements) => {
    if (!("IntersectionObserver" in window)) {
      elements.forEach(revealNow);
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              revealNow(entry.target);
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px 12% 0px", threshold: 0.01 }
      );
    }

    elements.forEach((element) => revealObserver.observe(element));
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-button");
    if (!button) {
      return;
    }

    const gallery = galleryState[button.dataset.gallery];
    if (!gallery) {
      return;
    }

    openLightbox(gallery.items, Number(button.dataset.index));
  });

  galleryLoadMore.addEventListener("click", () => {
    renderNextPage(galleryState.main);
  });

  surfacesLoadMore.addEventListener("click", () => {
    renderNextPage(galleryState.surfaces);
  });

  closeButton.addEventListener("click", closeLightbox);
  previousButton.addEventListener("click", () => moveLightbox(-1));
  nextButton.addEventListener("click", () => moveLightbox(1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    }

    if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });

  const init = async () => {
    observeReveals(document.querySelectorAll(".reveal"));

    const manifest = await loadManifest();
    const weekly = sortNewestByName(uniqueImages((manifest.weekly || []).map(normalizeImage)));
    const gallery = sortNewestByName(uniqueImages((manifest.gallery || []).map(normalizeImage)));
    const surfaces = sortNewestByName(uniqueImages((manifest.surfaces || []).map(normalizeImage)));
    const featured = weekly[0] || gallery[0];
    const previousPieces = uniqueImages([...gallery, ...weekly.slice(1)]).filter(
      (item) => !featured || item.src !== featured.src
    );

    setWeeklyArt(featured);
    setGallery(galleryState.main, previousPieces);
    setGallery(galleryState.surfaces, surfaces);
    scrollToCurrentHash();
  };

  init();
})();
