# -*- coding: utf-8 -*-
from django.db import transaction
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.forms import ValidationError
from django.template import RequestContext
from django.shortcuts import get_object_or_404, render_to_response, redirect
from django.utils.translation import gettext as _

from graphs.models import Graph
from schemas.forms import (NodeTypeForm, NodePropertyFormSet,
                           RelationshipTypeForm, RelationshipTypeFormSet)
from schemas.models import NodeType, RelationshipType


@login_required()
def schema_edit(request, graph_id):
    graph = get_object_or_404(Graph, id=graph_id)
    nodetypes = NodeType.objects.filter(schema__graph__id=graph_id)
    reltypes = None
    return render_to_response('schemas_edit.html',
                              {"graph": graph,
                               "node_types": nodetypes,
                               "relationship_types": reltypes},
                              context_instance=RequestContext(request))


@login_required()
def schema_nodetype_create(request, graph_id):
    graph = get_object_or_404(Graph, id=graph_id)
    empty_nodetype = NodeType()
    form = NodeTypeForm()
    formset = NodePropertyFormSet(instance=empty_nodetype)
    if request.POST:
        data = request.POST.copy()
        form = NodeTypeForm(data=data)
        formset = NodePropertyFormSet(data=data, instance=empty_nodetype)
        if form.is_valid() and formset.is_valid():
            with transaction.commit_on_success():
                node_type = form.save(commit=False)
                node_type.schema = graph.schema
                node_type.save()
                instances = formset.save(commit=False)
                for instance in instances:
                    instance.node = node_type
                    instance.save()
                redirect_url = reverse("schema_edit", args=[graph.id])
            return redirect(redirect_url)
    return render_to_response('schemas_item_create.html',
                              {"graph": graph,
                               "item_type": _("Type"),
                               "form": form,
                               "fields_to_hide": ["inverse", "arity",
                                                  "inheritance"],
                               "formset": formset},
                              context_instance=RequestContext(request))
RelationshipTypeForm, RelationshipTypeFormSet

@login_required()
def schema_relationshiptype_create(request, graph_id):
    graph = get_object_or_404(Graph, id=graph_id)
    empty_relationshiptype = RelationshipType()
    form = RelationshipTypeForm(initial={"arity": None})
    formset = RelationshipTypeFormSet(instance=empty_relationshiptype)
    if request.POST:
        data = request.POST.copy()
        form = RelationshipTypeForm(data=data)
        formset = RelationshipTypeFormSet(data=data,
                                          instance=empty_relationshiptype)
        if form.is_valid() and formset.is_valid():
            with transaction.commit_on_success():
                relationship_type = form.save(commit=False)
                if (relationship_type.source.schema != graph.schema
                    or relationship_type.target.schema != graph.schema):
                        raise ValidationError("Operation not allowed")
                relationship_type.schema = graph.schema
                relationship_type.save()
                instances = formset.save(commit=False)
                for instance in instances:
                    instance.relationship = relationship_type
                    instance.save()
                redirect_url = reverse("schema_edit", args=[graph.id])
            return redirect(redirect_url)
    return render_to_response('schemas_item_create.html',
                              {"graph": graph,
                               "item_type": _("Allowed Relationship"),
                               "form": form,
                               "fields_to_hide": ["inverse", "arity",
                                                  "inheritance"],
                               "formset": formset},
                              context_instance=RequestContext(request))
