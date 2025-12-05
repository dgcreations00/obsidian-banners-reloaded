<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Header from './Header.svelte';
  import { t } from '../i18n';
  import type { BannerStyle } from '../settings/settings';

  export let imagePath: string;
  export let errorMessage: string | undefined = undefined;
  export let initialY: string = '50%';
  export let onSavePosition: (position: { y: string }) => void;
  export let height: string = '200px';
  export let embedHeight: string = '100px';
  export let isHoverEditor: boolean = false;
  export let isEmbed: boolean = false;
  export let onLayoutChange: (detail: { marginBottom: string }) => void;

  export let headerText: string | undefined = undefined;
  export let headerIcon: string | undefined = undefined;
  export let headerHAlign: 'left' | 'center' | 'right' = 'left';
  export let headerVAlign: 'top' | 'center' | 'bottom' | 'edge' = 'bottom';
  export let headerDecor: 'none' | 'shadow' | 'border' = 'shadow';
  export let headerTitleSize: string = '1.2em';
  export let headerIconSize: string = '1.5em';
  export let isDraggable: boolean = true;
  export let bannerStyle: BannerStyle = 'solid';
  export let contentMargin: number = 0;

  let headerHeight = 0;
  let safeMargin = 0;
  let isDragging = false;
  let startMouseY: number;
  let startImageY: number;
  let bannerContainer: HTMLElement;
  let currentY: number = parseFloat(String(initialY || '50%'));
  let lastInitialY = initialY;
  let currentHeight = height;
  let isSmallContainer = false;

  let resizeObserver: ResizeObserver;

  onMount(() => {
    if (isHoverEditor && bannerContainer) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const isSmall = width < 600;
          
          if (isSmall !== isSmallContainer) {
            isSmallContainer = isSmall;
            currentHeight = isSmall ? embedHeight : height;
            const wrapper = bannerContainer.parentElement;
            if (wrapper) {
              if (isSmall) wrapper.classList.add('is-popover-embed');
              else wrapper.classList.remove('is-popover-embed');
            }
          }
        }
      });
      resizeObserver.observe(document.body);
      resizeObserver.observe(bannerContainer); 
    } else if (isEmbed) {
       currentHeight = embedHeight;
    }
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
  });

  function handleHeaderHeightChange(detail: { height: number; vAlign: string }) {
    headerHeight = detail.height;
    updateLayout();
  }

  function updateLayout() {
    safeMargin = 0;
    
    if (headerVAlign === 'edge' || headerVAlign === 'bottom') {
      const overlap = headerVAlign === 'edge' ? headerHeight / 2 : 0;
      safeMargin = Math.max(0, overlap + 16);
    }

    const finalMargin = safeMargin + Number(contentMargin);
    onLayoutChange({ marginBottom: `${finalMargin}px` });
  }

  $: if (contentMargin !== undefined || headerVAlign) {
    updateLayout();
  }

  $: if (initialY !== lastInitialY) {
    const normalizedY = String(initialY || '50%')
      .trim()
      .endsWith('%')
      ? String(initialY || '50%')
      : `${initialY || '50%'}`;
    
    if (!isDragging) {
      currentY = parseFloat(normalizedY);
    }
    lastInitialY = initialY;
  }

  function handleMouseDown(event: MouseEvent) {
    if (!isDraggable) return;
    if (!bannerContainer) return;
    event.preventDefault();
    isDragging = true;
    startMouseY = event.clientY;
    startImageY = currentY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging || !bannerContainer) return;
    const deltaY = event.clientY - startMouseY;
    const deltaPercent = (deltaY / bannerContainer.clientHeight) * 100;
    const newY = startImageY - deltaPercent;
    currentY = Math.max(0, Math.min(100, newY));
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    const finalPosition = `${currentY.toFixed(1)}%`;
    onSavePosition({ y: finalPosition });
  }
</script>

{#if imagePath}
  <div
    class="banner-container"
    class:is-draggable={isDraggable}
    class:is-dragging={isDragging}
    bind:this={bannerContainer}
    on:mousedown={handleMouseDown}
    role="button"
    tabindex="0"
    style:--banner-height={currentHeight} 
  >
    <img 
      src={imagePath} 
      alt="Banner" 
      class="banner-image" 
      class:style-gradient={bannerStyle === 'gradient'}
      class:style-blur={bannerStyle === 'blur'}
      class:style-swoosh={bannerStyle === 'swoosh'}
      class:style-swoosh-inverted={bannerStyle === 'swoosh-inverted'}
      style:--object-position-y="{currentY}%"
      draggable="false"
    />

    {#if headerText || headerIcon}
      <Header
        text={headerText}
        icon={headerIcon}
        hAlign={headerHAlign}
        vAlign={headerVAlign}
        decor={headerDecor}
        titleSize={headerTitleSize}
        iconSize={headerIconSize}
        onHeightChange={handleHeaderHeightChange}
      />
    {/if}
  </div>
{:else}
  <div class="banner-error-container" style:--banner-height={height}>
    <div class="banner-error-icon">❌</div>
    <div class="banner-error-message">{errorMessage || t('ERROR_UNKNOWN')}</div>
  </div>
{/if}

<style>
  .banner-container {
    height: var(--banner-height, 200px);
    width: 100%;
    margin-bottom: 0;
    overflow: visible;
    border-radius: 0px;
    position: relative;
  }
  .banner-error-container {
    height: var(--banner-height, 150px);
    width: 100%;
    margin-bottom: 1rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;

    border: 2px dashed var(--text-muted);
    border-radius: 8px;
    padding: 16px;
    color: var(--text-muted);
    text-align: center;
  }
  .banner-error-icon {
    font-size: 1.5em;
  }
  .banner-error-message {
    font-family: var(--font-monospace);
    font-size: var(--font-ui-smaller);
    word-break: break-all;
  }
  .banner-image {
    object-position: 50% var(--object-position-y, 50%);
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    will-change: object-position;
    cursor: default;
    transition: mask-image 0.3s ease, filter 0.3s ease, clip-path 0.3s ease;
  }
  .banner-image.style-gradient {
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      black 30%,
      rgba(0, 0, 0, 0.8) 50%,
      rgba(0, 0, 0, 0.2) 80%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      black 0%,
      black 30%,
      rgba(0, 0, 0, 0.8) 50%,
      rgba(0, 0, 0, 0.2) 80%,
      transparent 100%
    );
  }
  .banner-image.style-blur {
    filter: blur(4px);
  }
  .banner-image.style-swoosh {
    clip-path: ellipse(150% 100% at 50% 0%);
  }
  .banner-image.style-swoosh-inverted {
    -webkit-mask-image: radial-gradient(
      ellipse 160% 100% at 50% 120%,
      transparent 0%, 
      transparent 50%, 
      black 50.5% 
    );
    mask-image: radial-gradient(
      ellipse 160% 100% at 50% 120%, 
      transparent 0%, 
      transparent 50%, 
      black 50.5%
    );
  }
  .is-draggable {
    cursor: grab;
  }
  .is-draggable .banner-image {
    cursor: grab;
  }
  .is-draggable.is-dragging {
    cursor: grabbing;
  }
  .is-draggable.is-dragging .banner-image {
    cursor: grabbing;
  }
</style>
