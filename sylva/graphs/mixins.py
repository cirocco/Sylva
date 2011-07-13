# -*- coding: utf-8 -*-


class GraphMixin(object):

    def nodes(self):
        return NodesManager(self)

    def relationships(self):
        return RelationshipsManager(self)


class BaseManager(object):

    def __init__(self, graph):
        self.graph = graph
        self.gdb = graph.data.get_gdb()
        self.schema = graph.relaxed and graph.schema
        self.data = graph.data

    def filter_dict(self, properties=None):
        if properties:
            return dict(filter(lambda x: not str(x[0]).startswith("_"),
                               properties.items()))
        else:
            return {}

    def get(self, node_id, *args, **kwargs):
        try:
            return self._get(node_id)
        except KeyError:
            if args:
                return args[0]
            elif "default" in kwargs:
                return kwargs["default"]
            else:
                raise KeyError(node_id)


class NodesManager(BaseManager):

    def create(self, label, properties=None):
        properties = self.filter_dict(properties)
        node_id = self.gdb.create_node(label=label, properties=properties)
        self.data.total_nodes += 1
        self.data.save()
        return Node(node_id, self.graph, properties=properties)

    def all(self):
        nodes = []
        for node_dict in self.gdb.get_all_nodes(include_properties=True):
            node = Node(node_dict["id"], self.graph,
                         properties=node_dict["properties"])
            nodes.append(node)
        return nodes

    def iterator(self):
        for node_dict in self.gdb.get_all_nodes(include_properties=True):
            node = Node(node_dict["id"], self.graph,
                        properties=node_dict["properties"])
            yield node

    def in_bulk(self, id_list):
        nodes = []
        for node_dict in self.gdb.get_nodes(id_list, include_properties=True):
            node = Node(node_dict["id"], self.graph,
                        properties=node_dict["properties"])
            nodes.append(node)
        return nodes

    def _get(self, node_id):
        return Node(node_id, self.graph)


class RelationshipsManager(BaseManager):

    def create(self, source, target, label, properties=None):
        properties = self.filter_dict(properties)
        self.data.total_relationships += 1
        self.data.save()
        relationship_id = self.gdb.create_relationship(source.id, target.id,
                                                       label, properties)
        return Relationship(relationship_id, self.graph, properties=properties)

    def all(self):
        relationships = []
        eltos = self.gdb.get_all_relationships(include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def iterator(self):
        eltos = self.gdb.get_all_relationships(include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            yield relationship

    def in_bulk(self, id_list):
        relationships = []
        eltos = self.gdb.get_relationships(id_list, include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def _get(self, node_id):
        return Relationship(node_id, self.graph)


class NodeRelationshipsManager(BaseManager):

    def create(self, target, label, properties=None, outgoing=False):
        properties = self.filter_dict(properties)
        if outgoing:
            source_id = self.node_id
            target_id = target.id
        else:
            source_id = target.id
            target_id = self.node_id
        relationship_id = self.gdb.create_relationship(source_id, target_id,
                                                       label, properties)
        self.data.total_nodes += 1
        self.data.save()
        return Relationship(relationship_id, self.graph, properties=properties)

    def all(self):
        relationships = []
        eltos = self.gdb.get_node_relationships(self.node_id,
                                                include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def incoming(self):
        relationships = []
        eltos = self.gdb.get_node_relationships(self.node_id, incoming=True,
                                                include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def outgoing(self):
        relationships = []
        eltos = self.gdb.get_node_relationships(self.node_id, outgoing=True,
                                                include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def iterator(self):
        iterator = self.gdb.get_node_relationships(include_properties=True)
        for relationship_dict in iterator:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            yield relationship

    def in_bulk(self, id_list):
        relationships = []
        eltos = self.gdb.get_node_relationships(self.node_id, incoming=True,
                                                include_properties=True)
        for relationship_dict in eltos:
            relationship = Relationship(relationship_dict["id"], self.graph,
                                    properties=relationship_dict["properties"])
            relationships.append(relationship)
        return relationships

    def _get(self):
        return Relationship(self.node_id, self.graph)


class BaseElement(object):
    """
    Base element class for building Node and Relationship classes.
    """

    def __init__(self, id, graph, properties=None):
        self.id = id
        self.graph = graph
        self.gdb = graph.data.get_gdb()
        self.schema = graph.relaxed and graph.schema
        self.data = graph.data
        if not properties:
            self._get_properties()
        else:
            self._properties = properties

    def get(self, key, *args, **kwargs):
        try:
            return self.__getitem__(key)
        except KeyError:
            if args:
                return args[0]
            elif "default" in kwargs:
                return kwargs["default"]
            else:
                raise KeyError(key)

    def __contains__(self, obj):
        return obj in self._properties

    def set(self, key, value):
        self.__setitem__(key, value)

    def __len__(self):
        return len(self._properties)

    def __iter__(self):
        return self._properties.__iter__()

    def __eq__(self, obj):
        return (hasattr(obj, "id")
                and self.id == obj.id
                and hasattr(obj, "__class__")
                and self.__class__ == obj.__class__)

    def __ne__(self, obj):
        return not self.__cmp__(obj)

    def __nonzero__(self):
        return bool(self.id and self.gdb and self._properties)

    def __repr__(self):
        return self.__unicode__()

    def __str__(self):
        return self.__unicode__()

    def __unicode__(self):
        return u"<%s: %s>" % (self.__class__.__name__, self.id)


class Node(BaseElement):
    """
    Node class.
    """

    def delete(self, key=None):
        if key:
            self.__delitem__(key)
        else:
            self.gdb.delete_node(self.id)
            self.data.total_nodes -= 1
            self.data.save()
            del self

    def __getitem__(self, key):
        self._properties[key] = self.gdb.get_node_property(self.id)
        return self._properties[key]

    def __setitem__(self, key, value):
        self.gdb.set_node_property(self.id, key, value)
        self._properties[key] = value

    def __delitem__(self, key):
        self.gdb.delete_node_property(key)
        del self._properties[key]

    def relationships(self):
        return NodeRelationshipsManager(self.graph, self.schema, self.id)

    def _get_properties(self):
        self._properties = self.gdb.get_node_properties(self.id)
        return self._properties

    def _set_properties(self, properties=None):
        if not properties:
            return None
        self.gdb.set_node_properties(self.id, properties=properties)
        self._properties = properties
        return self._properties

    def _del_properties(self):
        self.gdb.delete_node_properties()
        self._properties = {}

    properties = property(_get_properties, _set_properties, _del_properties)


class Relationship(BaseElement):
    """
    Relationship class.
    """

    def delete(self, key=None):
        if key:
            self.__delitem__(key)
        else:
            self.gdb.delete_relationship(self.id)
            self.data.total_relationships -= 1
            self.data.save()
            del self

    def __getitem__(self, key):
        value = self.gdb.get_relationship_property(self.id, key)
        self._properties[key] = value
        return self._properties[key]

    def __setitem__(self, key, value):
        self.gdb.set_relationship_property(self.id, key, value)
        self._properties[key] = value

    def __delitem__(self, key):
        self.gdb.delete_relationship_property(key)
        del self._properties[key]

    def _get_source(self):
        node_id = self.gdb.get_relationship_source(self.id)
        return Node(self.graph, node_id)

    def _set_source(self, node):
        self.gdb.set_relationship_source(self.id, node.id)

    source = property(_get_source, _set_source)

    def _get_target(self):
        node_id = self.gdb.get_relationship_target(self.id)
        return Node(self.graph, node_id)

    def _set_target(self, node):
        self.gdb.set_relationship_target(self.id, node.id)

    target = property(_get_target, _set_target)

    def _get_label(self):
        return self.gdb.get_relationship_label(self.id)
    label = property(_get_label)

    def _get_properties(self):
        self._properties = self.gdb.get_relationship_properties(self.id)
        return self._properties

    def _set_properties(self, properties=None):
        if not properties:
            return None
        self.gdb.set_relationship_properties(self.id,
                                             properties=properties)
        self._properties = properties
        return self._properties

    def _del_properties(self):
        self.gdb.delete_relationship_properties()
        self._properties = {}

    properties = property(_get_properties, _set_properties, _del_properties)
