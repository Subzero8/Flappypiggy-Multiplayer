class KeyListener {
    constructor(key) {
        this.key = key;
        this.isDown = false;
        this.isUp = true;
        this.press = undefined;
        this.release = undefined;
        //The `downHandler`
        this.downHandler = event => {
            if (event.key === this.key) {
                if (this.isUp && this.press) this.press();
                this.isDown = true;
                this.isUp = false;
                event.preventDefault();
            }
        };

        //The `upHandler`
        this.upHandler = event => {
            if (event.key === this.key) {
                if (this.isDown && this.release) this.release();
                this.isDown = false;
                this.isUp = true;
                event.preventDefault();
            }
        };


        //Attach event listeners
        const downListener = this.downHandler.bind(key);
        const upListener = this.upHandler.bind(key);

        window.addEventListener("keydown", downListener, false);
        window.addEventListener("keyup", upListener, false);

        // Detach event listeners
        this.unsubscribe = () => {
            window.removeEventListener("keydown", downListener);
            window.removeEventListener("keyup", upListener);
        };

    }
}
