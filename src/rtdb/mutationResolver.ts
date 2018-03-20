import { graphql, ExecInfo } from 'graphql-anywhere/lib/async';
import { Resolver, VariableMap } from 'graphql-anywhere';
import * as has from "lodash/has";
import { DocumentNode, OperationTypeNode, OperationDefinitionNode, FragmentDefinitionNode } from 'graphql';
import {
  database
} from "firebase";
import {createFragmentMap} from 'apollo-utilities';

export interface ResolverContext {
  database: database.Database,
  operationType: OperationTypeNode,
  mainDefinition: OperationDefinitionNode | FragmentDefinitionNode;
  fragmentDefinitions: FragmentDefinitionNode[];
  exportVal: any
}

const resolver: Resolver = async (
  fieldName: string,
  root: any,
  args: any,
  context: ResolverContext,
  info: ExecInfo
) => {
  const {resultKey, directives, isLeaf} = info;
  const {fragmentDefinitions, database} = context;

  // return leaf in mutation
  if (isLeaf && root) {
    const snapshot = root.__snapshot;
    return has(directives, "pushKey") ? snapshot.key : null;
  }

  // By convention GraphQL recommends mutations having a single argument named "input"
  // https://dev-blog.apollodata.com/designing-graphql-mutations-e09de826ed97
  const payload: any = args && args.input;

  // deal with @rtdbUpdate, @rtdbSet, @rtdbRemove
  if (has(directives, "rtdbUpdate")) {
    const {ref} = directives.rtdbUpdate;
    await database.ref(ref).update(payload);
  } else if (has(directives, "rtdbSet")) {
    const {ref} = directives.rtdbSet;
    await database.ref(ref).set(payload);
  } else if (has(directives, "rtdbRemove")) {
    const {ref} = directives.rtdbRemove;
    await database.ref(ref).remove();
  } else if (has(directives, "rtdbPush")) {
    const {ref} = directives.rtdbPush;
    const newRef = database.ref(ref).push();
    await newRef.set(payload);
    return {
      __snapshot: newRef
    };
  }

  return null;
}

export default resolver;