/* eslint-disable no-continue */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import NP from 'number-precision'

enum State {
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export type CallbackParams = {
  from: number
  to: number
  stepSize: number
  speed: number
  counter: number
  asc: boolean
  state: State
}
export type Callback = (callbackParams: CallbackParams) => void
export type Callbacks = Callback | Array<Callback> | Set<Callback>
export type CallbackCollection = Partial<Record<State, Callbacks>>
type InnerCallbackCollection = Record<State, Set<Callback>>

type Options = {
  from?: number
  to?: number
  stepSize?: number
  speed?: number
  callbackCollection?: CallbackCollection
}

export default class Timer {
  protected from = 0

  protected to = 0

  protected stepSize = 1

  protected speed = 1 // unit: second per stepSize

  protected counter = 0

  private intervalId = 0

  protected asc = false

  protected state: State = State.READY

  protected options: Options = {}

  protected innerCallbackCollection: InnerCallbackCollection = {
    [State.READY]: new Set<Callback>(),
    [State.RUNNING]: new Set<Callback>(),
    [State.PAUSED]: new Set<Callback>(),
    [State.FINISHED]: new Set<Callback>(),
  }

  constructor(options: Options = {}) {
    options && this.setOptoins(options)
    options.callbackCollection && this.addCallbacks(options.callbackCollection)
  }

  protected init() {
    this.intervalId && clearInterval(this.intervalId)
    this.asc = this.from < this.to
    this.counter = this.from
    this.state = State.READY
    return this
  }

  public setOptoins(options: Options) {
    this.options = {
      ...this.options,
      ...options,
    }

    options.from && (this.from = options.from)
    options.to && (this.to = options.to)
    options.stepSize && (this.stepSize = options.stepSize)
    options.speed && (this.speed = options.speed)
    this.init()
    return this
  }

  /// callbacks ///

  public addCallbacks(callbackCollection: CallbackCollection) {
    for (const state in callbackCollection) {
      const callbacks = callbackCollection[state as State]
      if (!callbacks) continue

      const cbs = this.innerCallbackCollection[state as State] as Set<Callback>

      if (callbacks instanceof Function) {
        cbs.add(callbacks)
      } else {
        callbacks.forEach((cb) => cbs.add(cb))
      }
    }
    return this
  }

  protected invokeCallbacks(state: State) {
    const cbs = this.innerCallbackCollection[state]

    cbs.forEach((cb) => cb(this.createCallbackParams()))
    return this
  }

  protected createCallbackParams(params?: CallbackParams): CallbackParams {
    return {
      from: this.from,
      to: this.from,
      stepSize: this.stepSize,
      speed: this.speed,
      counter: this.counter,
      asc: this.asc,
      state: this.state,
      ...params,
    }
  }

  /// methods ///

  protected startInterval(): Timer {
    if (this.state === State.RUNNING) {
      return this
    }

    this.state = State.RUNNING

    this.intervalId = (window || global).setInterval(() => {
      if (
        (this.asc && this.counter >= this.to) ||
        (!this.asc && this.counter <= this.to)
      ) {
        this.invokeCallbacks(State.FINISHED)
        clearInterval(this.intervalId)
        return
      }

      this.counter = NP.plus(this.counter, this.stepSize * (this.asc ? 1 : -1))
      this.invokeCallbacks(State.RUNNING)
    }, 1000 / this.speed)

    return this
  }

  protected pauseInterval(): Timer {
    if (this.state !== State.RUNNING) {
      return this
    }

    clearInterval(this.intervalId)
    // console.log('timer pause')

    this.state = State.PAUSED
    return this
  }

  protected resumeInterval(): Timer {
    if (this.state !== State.PAUSED) {
      return this
    }

    return this.startInterval()
  }

  protected resetInterval(): Timer {
    return this.init()
  }

  /// api ///

  public start(): Timer {
    this.startInterval()
    return this
  }

  public pause(): Timer {
    this.pauseInterval()
    return this
  }

  public resume(): Timer {
    this.resumeInterval()
    return this
  }

  public reset(): Timer {
    return this.resetInterval()
  }
}
