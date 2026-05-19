(function () {
  const imagePattern = /\.(png|apng|jpg|jpeg|webp|gif)$/i;
  const manifestUrl = new URL("art-manifest.json", document.baseURI);

  const weeklyImage = document.querySelector("#weeklyImage");
  const weeklyEmpty = document.querySelector("#weeklyEmpty");
  const weeklyTitle = document.querySelector("#weeklyTitle");
  const galleryGrid = document.querySelector("#galleryGrid");
  const galleryEmpty = document.querySelector("#galleryEmpty");
  const template = document.querySelector("#galleryItemTemplate");
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = document.querySelector("#lightboxImage");
  const lightboxTitle = document.querySelector("#lightboxTitle");
  const closeButton = document.querySelector(".lightbox-close");
  const previousButton = document.querySelector(".lightbox-nav.previous");
  const nextButton = document.querySelector(".lightbox-nav.next");

  let galleryItems = [];
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
      return { weekly: [], gallery: [] };
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

  const setGallery = (images) => {
    galleryGrid.replaceChildren();
    galleryItems = images;

    if (!images.length) {
      galleryEmpty.classList.add("is-visible-empty");
      revealNow(galleryEmpty);
      return;
    }

    galleryEmpty.classList.remove("is-visible-empty");

    const fragment = document.createDocumentFragment();
    images.forEach((image, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const button = node.querySelector(".gallery-button");
      const img = node.querySelector("img");
      const title = node.querySelector(".piece-title");
      const tilt = ((index % 5) - 2) * 0.7;

      node.style.setProperty("--tilt", `${tilt}deg`);
      node.style.setProperty("--reveal-rotate", `${tilt}deg`);
      button.dataset.index = String(index);
      img.src = image.src;
      img.alt = image.title;
      img.loading = "lazy";
      img.decoding = "async";
      title.textContent = image.title;
      fragment.appendChild(node);
    });

    galleryGrid.appendChild(fragment);
    observeReveals(galleryGrid.querySelectorAll(".reveal"));
  };

  const openLightbox = (index) => {
    activeIndex = index;
    const image = galleryItems[activeIndex];

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
    if (!galleryItems.length) {
      return;
    }

    const nextIndex = (activeIndex + step + galleryItems.length) % galleryItems.length;
    openLightbox(nextIndex);
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

  galleryGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".gallery-button");
    if (!button) {
      return;
    }

    openLightbox(Number(button.dataset.index));
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
    const featured = weekly[0] || gallery[0];
    const previousPieces = uniqueImages([...gallery, ...weekly.slice(1)]).filter(
      (item) => !featured || item.src !== featured.src
    );

    setWeeklyArt(featured);
    setGallery(previousPieces);
  };

  init();
})();
