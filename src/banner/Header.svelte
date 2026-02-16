<script lang="ts">
  import { setIcon } from 'obsidian';
  import { onMount } from 'svelte';

  export let text: string | undefined = undefined;
  export let icon: string | undefined = undefined;
  export let hAlign: 'left' | 'center' | 'right' = 'left';
  export let vAlign: 'top' | 'center' | 'bottom' | 'edge' = 'bottom';
  export let decor: 'none' | 'shadow' | 'border' = 'shadow';
  export let titleSize: string = '1.2em';
  export let iconSize: string = '1.5em';
  export let onHeightChange: (detail: { height: number; vAlign: string }) => void;

  let iconEl: HTMLElement;
  let clientHeight = 0;
  const isObsidianIcon = icon && icon.startsWith('lucide-');

  onMount(() => {
    if (isObsidianIcon && iconEl) {
      setIcon(iconEl, icon);
    }
  });

  $: if (clientHeight > 0 || vAlign) {
    onHeightChange({ height: clientHeight, vAlign });
  }
</script>

<div
  class="banner-header-wrapper"
  class:banner-h-left={hAlign === 'left'}    
  class:banner-h-center={hAlign === 'center'}
  class:banner-h-right={hAlign === 'right'}  
  class:banner-v-top={vAlign === 'top'}      
  class:banner-v-center={vAlign === 'center'}
  class:banner-v-bottom={vAlign === 'bottom'}
  class:banner-v-edge={vAlign === 'edge'}    
  bind:clientHeight
>
  <div 
    class="banner-header-content" 
    class:banner-decor-shadow={decor === 'shadow'} 
    class:banner-decor-border={decor === 'border'} 
  >
    {#if icon}
      <div class="banner-icon" style:--icon-size={iconSize} bind:this={iconEl}>
        {#if !isObsidianIcon}
          {icon}
        {/if}
      </div>
    {/if}
    {#if text}
      <h1 class="banner-header-title" style:font-size={titleSize}>{text}</h1>
    {/if}
  </div>
</div>