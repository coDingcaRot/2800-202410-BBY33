var ddShow = document.getElementById('dd-show');
var ddMenu = document.getElementById('dd-menu');
var ddButton = document.querySelector('.dd-button');
var modal = document.getElementById('dd-custom-modal');

ddMenu.style.display = 'none';

ddButton.addEventListener('click', function() {
    if (ddMenu.style.display === 'none') {
        ddMenu.style.display = 'block';
    } else {
        ddMenu.style.display = 'none';
    }
});

var dropdownItems = document.querySelectorAll('.dd-menu li');

dropdownItems.forEach(function(item) {
    item.addEventListener('click', function() {
        ddShow.textContent = item.textContent;
        if (item.id === 'dd-custom') {
            modal.style.display = 'block';
            ddMenu.style.display = 'none';
        } else {
            modal.style.display = 'none';
            ddMenu.style.display = 'none';
        }
    });
});

// Close modal when Close button is clicked
var closeModalButton = modal.querySelector('.btn-close');
closeModalButton.addEventListener('click', function() {
    modal.style.display = 'none';
    ddShow.textContent = "None";
});




/* Utils */
function _debounce(func, wait_ms, immediate) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      if (immediate && !timeout) func.apply(this, args);
      timeout = setTimeout(() => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      }, wait_ms);
    };
  }
  
  /* ScrollPicker */
  class ScrollPicker {
    constructor(config) {
      this.config = config;
      this.getCurrent = () => {
        if (!this.root) throw new Error("root is not defined");
        const index = Math.round(this.root.scrollTop / this.itemHeight);
        return { item: this.config.items[index], index };
      };
      this.setCurrent = (item) => {
        if (!this.root) throw new Error("root is not defined");
        const index = this.config.items.indexOf(item);
        this.root.scrollTo(0, index * this.itemHeight);
      };
      this.init();
    }
    init() {
      this.initDOM();
      // wait DOM render
      setTimeout(() => {
        this.itemHeight = this.root?.firstElementChild?.clientHeight || 0;
        this.initCallBack();
        this.config.default && this.setCurrent(this.config.default);
      }, 0);
    }
    initDOM() {
      // container
      this.root = this.createRoot();
      // items
      const fragment = document.createDocumentFragment(); 
      this.config.items.forEach((item) => {
        const scrollItem = document.createElement("li");
        scrollItem.innerText = item.toString();
        fragment.appendChild(scrollItem);
      });
      this.root.appendChild(fragment);
      // default
      this.config.entry?.appendChild(this.root);
    }
    initCallBack() {
      if (!this.root) throw new Error("root is not defined");
      if (!this.config.onScroll && !this.config.onChange) return;
      // onScroll
      if (this.config.onScroll)
        this.root.addEventListener("scroll", () => {
          this.config.onScroll(this.root.scrollTop);
        });
      // onChange
      if (this.config.onChange)
        this.root.addEventListener(
          "scroll",
          _debounce(() => {
            const { item, index } = this.getCurrent();
            this.config.onChange(item, index);
          }, 250)
        );
    }
    createRoot() {
      const root = document.createElement("ul");
      root.classList.add(this.config.styleClass || "scroll-picker");
      root.addEventListener("mousedown", (e) => {
        root.style.scrollSnapType = "none";
        e.preventDefault();
        const startY = e.clientY;
        const startScrollTop = root.scrollTop;
        const move = (e) => {
          const distanceY = e.clientY - startY;
          root.scrollTo(0, startScrollTop - distanceY);
        };
        const up = () => {
          root.style.scrollSnapType = "y mandatory";
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
      return root;
    }
  }
  
  /* Usage */
  let hours = 5;
  let minutes = 30;
  let twelveHour = 'AM';
  const hour = document.querySelector("#hour");
  const minute = document.querySelector("#minute");
  const twelve = document.querySelector("#twelve");
  
  const hourPicker = new ScrollPicker({
    items: Array.from({ length: 12 }, (_, i) => i + 1),
    default: hours,
    entry: document.querySelector("#hours"),
    onChange: (item, index) => {
      hour.innerText = item;
    }
  });
  
  const minutePicker = new ScrollPicker({
    items: Array.from({ length: 60 }, (_, i) => {
      if(i < 10) {
        return `0${i}`
      } else return i
    }),
    default: minutes,
    entry: document.querySelector("#minutes"),
    onChange: (item, index) => {
      minute.innerText = item;
    }
  });
  
  const twelveHourPicker = new ScrollPicker({
    items: ['AM', 'PM'],
    default: twelveHour,
    entry: document.querySelector("#twelveHour"),
    onChange: (item, index) => {
      twelve.innerText = item;
    }
  });



// for taskform close button to redirect back to taskpage
document.getElementById("taskform-close-btn").addEventListener("click", function() {
    window.location.href = "/taskPage";
});