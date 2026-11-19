(() => {
  "use strict";

  const PAGE_SIZE = 48;
  const DOWNLOAD_ALL_URL = "";
  const allFiles = Array.isArray(window.PHOTO_FILES) ? window.PHOTO_FILES : [];
  const albums = [
    {
      id: "retreat",
      label: "임직자 수련회",
      files: allFiles.filter((filename) => filename.startsWith("업로드용-")),
    },
    {
      id: "worship",
      label: "임직감사예배",
      files: allFiles.filter((filename) => !filename.startsWith("업로드용-")),
    },
  ];

  const grid = document.querySelector("#photoGrid");
  const status = document.querySelector("#photoStatus");
  const galleryTitle = document.querySelector("#galleryTitle");
  const albumButtons = [...document.querySelectorAll("[data-album]")];
  const loadMoreButton = document.querySelector("#loadMoreButton");
  const downloadAllButton = document.querySelector("#downloadAllButton");
  const viewer = document.querySelector("#viewer");
  const viewerImage = document.querySelector("#viewerImage");
  const viewerCount = document.querySelector("#viewerCount");
  const savePhotoButton = document.querySelector("#savePhotoButton");
  const saveHelp = document.querySelector("#saveHelp");
  const previousPhoto = document.querySelector("#previousPhoto");
  const nextPhoto = document.querySelector("#nextPhoto");
  const backToTop = document.querySelector("#backToTop");
  const viewerTitle = document.querySelector("#viewerTitle");

  let activeAlbum = albums[0];
  let files = activeAlbum.files;
  let renderedCount = 0;
  let currentIndex = 0;
  let previouslyFocused = null;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function fileUrl(folder, filename) {
    return `${folder}/${encodeURIComponent(filename)}`;
  }

  function setStatus() {
    status.textContent = `${activeAlbum.label} ${files.length.toLocaleString("ko-KR")}장 중 ${renderedCount.toLocaleString("ko-KR")}장 표시`;
    loadMoreButton.classList.toggle("is-hidden", renderedCount >= files.length);
  }

  function createPhotoCard(filename, index) {
    const button = document.createElement("button");
    const image = document.createElement("img");
    const number = document.createElement("span");

    button.type = "button";
    button.className = "photo-card";
    button.setAttribute("aria-label", `${activeAlbum.label} 사진 ${index + 1} 크게 보기`);
    button.addEventListener("click", () => openViewer(index));

    image.src = fileUrl("thumbnails", filename);
    image.alt = `${activeAlbum.label} 사진 ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";

    number.className = "photo-card__number";
    number.textContent = index + 1;

    button.append(image, number);
    return button;
  }

  function renderNextPage() {
    const nextCount = Math.min(renderedCount + PAGE_SIZE, files.length);
    const fragment = document.createDocumentFragment();

    for (let index = renderedCount; index < nextCount; index += 1) {
      fragment.append(createPhotoCard(files[index], index));
    }

    grid.append(fragment);
    renderedCount = nextCount;
    setStatus();
  }

  function updateViewer() {
    const filename = files[currentIndex];
    viewerImage.src = fileUrl("photos", filename);
    viewerImage.alt = `${activeAlbum.label} 사진 ${currentIndex + 1}`;
    viewerTitle.textContent = `${activeAlbum.label} 사진`;
    viewerCount.textContent = `${currentIndex + 1} / ${files.length}`;
    previousPhoto.disabled = files.length <= 1;
    nextPhoto.disabled = files.length <= 1;
  }

  function openViewer(index) {
    previouslyFocused = document.activeElement;
    currentIndex = index;
    updateViewer();
    viewer.hidden = false;
    document.body.classList.add("viewer-open");
    viewer.querySelector("[data-close-viewer]").focus({ preventScroll: true });
  }

  function closeViewer() {
    viewer.hidden = true;
    viewerImage.removeAttribute("src");
    document.body.classList.remove("viewer-open");
    previouslyFocused?.focus({ preventScroll: true });
  }

  function showPrevious() {
    currentIndex = (currentIndex - 1 + files.length) % files.length;
    updateViewer();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % files.length;
    updateViewer();
  }

  function selectAlbum(albumId) {
    const selectedAlbum = albums.find((album) => album.id === albumId);
    if (!selectedAlbum || selectedAlbum === activeAlbum) return;

    activeAlbum = selectedAlbum;
    files = activeAlbum.files;
    renderedCount = 0;
    currentIndex = 0;
    grid.replaceChildren();
    galleryTitle.textContent = `${activeAlbum.label} 사진`;

    albumButtons.forEach((button) => {
      const isActive = button.dataset.album === activeAlbum.id;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (files.length === 0) {
      status.textContent = `${activeAlbum.label} 사진을 준비하지 못했습니다.`;
      loadMoreButton.classList.add("is-hidden");
      return;
    }

    renderNextPage();
  }

  async function saveCurrentPhoto() {
    const filename = files[currentIndex];
    const url = fileUrl("photos", filename);

    savePhotoButton.disabled = true;
    savePhotoButton.textContent = "사진 준비 중…";

    try {
      if (isIOS && navigator.share && navigator.canShare) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("사진을 불러오지 못했습니다.");
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "사진 저장" });
          return;
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
    } catch (error) {
      if (error?.name !== "AbortError") {
        window.open(url, "_blank", "noopener");
      }
    } finally {
      savePhotoButton.disabled = false;
      savePhotoButton.textContent = "이 사진 휴대폰에 저장";
    }
  }

  function configureDownloadAll() {
    if (!DOWNLOAD_ALL_URL) return;
    downloadAllButton.href = DOWNLOAD_ALL_URL;
    downloadAllButton.classList.remove("is-hidden");
  }

  function configureHelp() {
    saveHelp.textContent = isIOS
      ? "아이폰: 다음 공유 화면에서 ‘이미지 저장’을 눌러주세요."
      : "사진은 휴대폰의 다운로드 폴더에 저장됩니다.";
  }

  loadMoreButton.addEventListener("click", renderNextPage);
  albumButtons.forEach((button) => {
    button.addEventListener("click", () => selectAlbum(button.dataset.album));
  });
  previousPhoto.addEventListener("click", showPrevious);
  nextPhoto.addEventListener("click", showNext);
  savePhotoButton.addEventListener("click", saveCurrentPhoto);
  viewer.querySelectorAll("[data-close-viewer]").forEach((element) => {
    element.addEventListener("click", closeViewer);
  });

  document.addEventListener("keydown", (event) => {
    if (viewer.hidden) return;
    if (event.key === "Escape") closeViewer();
    if (event.key === "ArrowLeft") showPrevious();
    if (event.key === "ArrowRight") showNext();
  });

  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener(
    "scroll",
    () => backToTop.classList.toggle("is-visible", window.scrollY > 800),
    { passive: true },
  );

  albums.forEach((album) => {
    const count = document.querySelector(`[data-album-count="${album.id}"]`);
    if (count) count.textContent = `${album.files.length.toLocaleString("ko-KR")}장`;
  });

  if (allFiles.length === 0 || files.length === 0) {
    status.textContent = "사진 목록을 준비하지 못했습니다.";
    loadMoreButton.classList.add("is-hidden");
    return;
  }

  configureDownloadAll();
  configureHelp();
  renderNextPage();
})();
