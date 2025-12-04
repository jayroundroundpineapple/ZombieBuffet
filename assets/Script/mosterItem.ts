const { ccclass, property } = cc._decorator;

@ccclass
export default class mosterItem extends cc.Component {
    @property(cc.Label)
    private hpLabel: cc.Label = null; //血条Label，在编辑器中设置
    
    private currentHp: number = 0;
    private positionIndex: number = 0; //当前在floorPosArr中的位置索引
    
    /**
     * 设置血条数量
     */
    public setHp(hp: number) {
        this.currentHp = hp;
        if(this.hpLabel) {
            this.hpLabel.string = hp.toString();
        }
    }
    /**
     * 获取当前血条
     */
    public getHp(): number {
        return this.currentHp;
    }
    
    /**
     * 设置位置索引
     */
    public setPositionIndex(index: number) {
        this.positionIndex = index;
    }
    
    /**
     * 获取位置索引
     */
    public getPositionIndex(): number {
        return this.positionIndex;
    }
    
    /**
     * 播放移动动画
     */
    public playWalkAnimation() {
        try {
            const spineComponent = this.node.getComponentInChildren(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, 'walk', true);
            }
        } catch(e) {
            console.log('播放移动动画失败', e);
        }
    }
    
    /**
     * 播放待机动画
     */
    public playIdleAnimation() {
        try {
            const spineComponent = this.node.getComponentInChildren(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, 'idle', true);
            }
        } catch(e) {
            console.log('播放待机动画失败', e);
        }
    }
}

