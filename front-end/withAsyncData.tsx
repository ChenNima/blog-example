import React, { Component, ComponentType } from 'react';
import omit from 'lodash-es/omit';

interface PropsType<T> {
  data: PromiseLike<T> | T | null;
  onDataReady?: (data: T) => void;
  onDataError?: (e: any) => void;
  cleanData?: boolean;
}

interface StateType<T> {
  dataPromise?: PromiseLike<T> | null;
  data?: T;
  lastData?: T;
  isLoadingData: boolean;
  dataError?: any;
}

function withAsyncData<ChildPropsType extends { data?: any }>(Child: ComponentType<ChildPropsType>) {
  
  // first, type of data field is determined by props type of Child component
  type Data = ChildPropsType['data'];
  // then the final props type is a mixture of Child props type and HOC props type
  // the 'data' field will be replaced by HOC props
  type MixedPropsType = Omit<ChildPropsType, 'data'> & PropsType<Data>;

  return class WithAsyncData extends Component<MixedPropsType, StateType<Data>> {

    private mounted: boolean = false;

    constructor(props: MixedPropsType) {
      super(props);
      this.state = {
        isLoadingData: false
      };
    }
  
    static getDerivedStateFromProps(props: PropsType<Data>, state: StateType<Data>): StateType<Data> | null {
      const { data, cleanData } = props;
      const { lastData } = state;
      if( data === lastData ) {
        return null;
      }
      if (!isThenable(data)) {
        return {
          lastData: data,
          data,
          dataPromise: null,
          isLoadingData: false
        };
      } else {
        const newState: any = {
          lastData: data,
          dataPromise: data,
          isLoadingData: true
        };
        if(cleanData) {
          newState.data = null;
        }
        return newState;
      }
    }
  
    componentDidMount() {
      this.mounted = true;
      if (this.state.dataPromise) {
        this.resolveAsyncData(this.state.dataPromise);
      }
    }
  
    componentDidUpdate(prevProps: PropsType<Data>, prevState: StateType<Data>) {
      if (this.state.dataPromise && (this.state.dataPromise !== prevState.dataPromise)) {
        this.resolveAsyncData(this.state.dataPromise);
      }
    }
  
    async resolveAsyncData(dataPromise: PromiseLike<Data>) {
      try {
        const data = await dataPromise;
        if (this.shouldKeepResult(dataPromise)) {
          if(this.props.onDataReady) {
            this.props.onDataReady(data);
          }
          this.setState({
            data,
            isLoadingData: false,
            dataPromise: null,
            dataError: null
          });
        }
      } catch (error) {
        if (this.shouldKeepResult(dataPromise)) {
          if(this.props.onDataError) {
            this.props.onDataError(error);
          }
          this.setState({
            dataError: error,
            isLoadingData: false,
            dataPromise: null
          });
        }
      }
    }

    shouldKeepResult(dataPromise: PromiseLike<Data>): boolean {
      return dataPromise === this.state.dataPromise && this.mounted;
    }
  
    render() {
      const props = {
        ...omit(this.props, ['data']),
        ...this.state
      };
      return <Child {...props as ChildPropsType} />;
    }

    componentWillUnmount() {
      this.mounted = false;
    }
  };
}

export default withAsyncData;
